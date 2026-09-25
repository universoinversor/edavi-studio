'use client';
// Cola de generaciones: persiste en localStorage, sigue cada solicitud con
// backoff (2 s → 10 s, como recomienda Higgsfield) y reanuda tras recargar.
import { useSyncExternalStore } from 'react';
import { generation, storage } from './providers';
import { extractOutputs, TERMINAL } from './schema';
import { friendlyError, isConcurrencyError } from './errors';
import { COPY } from './copy';
import { getModel } from './catalog';
import { chainedPayload } from './plan';
import { currentUserId } from './auth';

const KEY = 'edavi.jobs';
const MAX_JOBS = 200;
const LOCAL_RETRY_MS = 8000;
const EMPTY = [];

let jobs = EMPTY;
let loaded = false;
const listeners = new Set();
const timers = new Map();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { jobs = JSON.parse(localStorage.getItem(KEY)) || []; } catch { jobs = []; }
  // Retoma el seguimiento de lo que quedó pendiente.
  for (const job of jobs) {
    if (job.status === 'submitting') patch(job.localId, { status: 'error', error: COPY.errors.closedWhileSending });
    else if (!TERMINAL.has(job.status) && job.status !== 'error') schedule(job.localId, 500);
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(jobs.slice(0, MAX_JOBS))); } catch { /* cuota llena */ }
  for (const l of listeners) l();
}

function patch(localId, changes) {
  jobs = jobs.map((j) => (j.localId === localId ? { ...j, ...changes, updatedAt: Date.now() } : j));
  persist();
  const job = find(localId);
  // El intervalo de sondeo es solo local; no merece un guardado en la nube.
  if (job && !(Object.keys(changes).length === 1 && 'pollDelay' in changes)) storage.saveJob(job);
}

// Al iniciar sesión, mezcla el historial de la nube con el local (gana el más reciente).
async function syncFromCloud() {
  const remote = await storage.fetchJobs();
  if (!remote) return;
  const byId = new Map(jobs.map((j) => [j.localId, j]));
  for (const r of remote) {
    const local = byId.get(r.localId);
    if (!local || (r.updatedAt || 0) > (local.updatedAt || 0)) byId.set(r.localId, { ...local, ...r });
  }
  // Lo que solo existía en este navegador se sube a la nube.
  const remoteIds = new Set(remote.map((r) => r.localId));
  for (const j of jobs) if (!remoteIds.has(j.localId)) storage.saveJob(j);
  jobs = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_JOBS);
  persist();
  for (const job of jobs) {
    if (!TERMINAL.has(job.status) && job.status !== 'error' && job.status !== 'submitting' && !timers.has(job.localId)) schedule(job.localId, 500);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('edavi:user', (e) => { if (e.detail?.userId) { load(); syncFromCloud(); } });
}

function find(localId) {
  return jobs.find((j) => j.localId === localId);
}

function schedule(localId, delay) {
  clearTimeout(timers.get(localId));
  timers.set(localId, setTimeout(() => tick(localId), delay));
}

async function tick(localId) {
  const job = find(localId);
  if (!job) return;
  if (job.status === 'local_queue') return trySubmit(localId);
  try {
    const result = await generation.status(job.requestId);
    const outputs = extractOutputs(result);
    patch(localId, {
      status: result.status,
      outputs: outputs.length ? outputs : job.outputs,
      error: result.error || (result.status === 'nsfw' ? COPY.errors.nsfw : null),
      pollDelay: undefined,
    });
    if (!TERMINAL.has(result.status)) {
      const next = Math.min((job.pollDelay || 2000) * 1.5, 10000);
      patch(localId, { pollDelay: next });
      schedule(localId, next + Math.random() * 500);
    } else {
      timers.delete(localId);
      if (result.status === 'completed') startChain(localId);
      // Aviso para la interfaz (toast «resultado listo» / «falló»).
      window.dispatchEvent(new CustomEvent('edavi:job-finished', { detail: { localId, status: result.status, family: job.family, studio: job.studio } }));
      wakeLocalQueue();
    }
  } catch (err) {
    if (err.status === 401 || err.status === 404) {
      patch(localId, { status: 'error', error: friendlyError(err) });
      return;
    }
    // Fallo de red o 5xx: reintenta el GET con backoff.
    schedule(localId, Math.min((job.pollDelay || 2000) * 2, 15000));
  }
}

// Flujos: cuando un trabajo termina, lanza automáticamente el siguiente paso
// (p. ej. animar la imagen generada con un modelo de video).
function startChain(localId) {
  const job = find(localId);
  if (!job?.then || job.chainedTo) return;
  const model = getModel(job.then.modelId);
  const url = job.outputs.find((o) => o.type === 'image')?.url;
  if (!model || !url) return;
  const payload = chainedPayload(model, job.then.values, url, job.then.inputKey);
  const next = enqueue({ model, payload, group: job.group, label: 'Flujo · animado', parent: localId });
  patch(localId, { chainedTo: next });
  generation.estimate(model.endpoint, payload).then((e) => setEstimate(next, e)).catch(() => {});
}

function wakeLocalQueue() {
  const waiting = jobs.filter((j) => j.status === 'local_queue').sort((a, b) => a.createdAt - b.createdAt)[0];
  if (waiting) schedule(waiting.localId, 300);
}

async function trySubmit(localId) {
  const job = find(localId);
  if (!job) return;
  patch(localId, { status: 'submitting' });
  try {
    const handle = await generation.submit(job.endpoint, job.payload);
    patch(localId, { status: handle.status || 'queued', requestId: handle.request_id, error: null });
    schedule(localId, 2000);
  } catch (err) {
    if (isConcurrencyError(err)) {
      // No se aceptó la solicitud: es seguro reintentar más tarde.
      patch(localId, { status: 'local_queue', error: null });
      schedule(localId, LOCAL_RETRY_MS);
      return;
    }
    patch(localId, { status: 'error', error: friendlyError(err) });
  }
}

export function enqueue({ model, payload, estimate, then, group, label, parent }) {
  load();
  const localId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    localId,
    modelId: model.id,
    endpoint: model.endpoint,
    family: model.family,
    workflow: model.workflow,
    studio: model.studio,
    output: model.output,
    payload,
    estimate: estimate || null,
    then: then || null,
    group: group || null,
    label: label || null,
    parent: parent || null,
    favorite: false,
    status: 'submitting',
    outputs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs = [job, ...jobs].slice(0, MAX_JOBS);
  persist();
  storage.saveJob(job);
  trySubmit(localId);
  return localId;
}

export async function cancelJob(localId) {
  const job = find(localId);
  if (!job) return;
  if (job.status === 'local_queue') {
    clearTimeout(timers.get(localId));
    patch(localId, { status: 'canceled' });
    return;
  }
  await generation.cancel(job.requestId);
  patch(localId, { status: 'canceled' });
}

// Salidas a mostrar: la copia guardada en tu nube si existe; si no, la de Higgsfield.
export function withArchive(job) {
  if (!job.archived?.length) return job;
  return { ...job, outputs: job.outputs.map((o, i) => (job.archived[i]?.url ? { ...o, url: job.archived[i].url } : o)), saved: true };
}

// Guarda los archivos en Supabase Storage para que no caduquen a los 7 días.
export async function archiveJob(localId) {
  await storage.flushNow();
  const archived = await storage.archiveOutputs(localId);
  patch(localId, { archived });
  return archived;
}

export function toggleFavorite(localId) {
  const job = find(localId);
  if (!job) return;
  patch(localId, { favorite: !job.favorite });
  // Un favorito se guarda automáticamente en tu nube.
  if (!job.favorite && currentUserId() && job.status === 'completed' && !(job.archived || []).length) {
    archiveJob(localId).catch(() => {});
  }
}

export function setEstimate(localId, estimate) {
  patch(localId, { estimate });
}

export function setArchived(localId, archived) {
  patch(localId, { archived });
}

export function removeJob(localId) {
  clearTimeout(timers.get(localId));
  jobs = jobs.filter((j) => j.localId !== localId);
  persist();
  storage.deleteJobs([localId]).catch(() => {});
}

export function clearFinished() {
  // Los favoritos se conservan.
  const keep = (j) => j.favorite || (!TERMINAL.has(j.status) && j.status !== 'error');
  const removed = jobs.filter((j) => !keep(j)).map((j) => j.localId);
  jobs = jobs.filter(keep);
  persist();
  storage.deleteJobs(removed).catch(() => {});
}

function subscribe(listener) {
  load();
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key !== KEY) return;
    try { jobs = JSON.parse(e.newValue) || []; } catch { /* ignorar */ }
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export function useJobs() {
  return useSyncExternalStore(subscribe, () => jobs, () => EMPTY);
}

'use client';
// Cola de generaciones: persiste en localStorage, sigue cada solicitud con
// backoff (2 s → 10 s, como recomienda Higgsfield) y reanuda tras recargar.
import { useSyncExternalStore } from 'react';
import { cancelRequest, getRequestStatus, submitGeneration } from './client';
import { extractOutputs, TERMINAL } from './schema';
import { friendlyError, isConcurrencyError } from './errors';

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
    if (job.status === 'submitting') patch(job.localId, { status: 'error', error: 'La página se cerró mientras se enviaba. Revisa tu consola de Higgsfield.' });
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
    const result = await getRequestStatus(job.requestId);
    const outputs = extractOutputs(result);
    patch(localId, {
      status: result.status,
      outputs: outputs.length ? outputs : job.outputs,
      error: result.error || (result.status === 'nsfw' ? 'La entrada o el resultado fue rechazado por moderación.' : null),
      pollDelay: undefined,
    });
    if (!TERMINAL.has(result.status)) {
      const next = Math.min((job.pollDelay || 2000) * 1.5, 10000);
      patch(localId, { pollDelay: next });
      schedule(localId, next + Math.random() * 500);
    } else {
      timers.delete(localId);
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

function wakeLocalQueue() {
  const waiting = jobs.filter((j) => j.status === 'local_queue').sort((a, b) => a.createdAt - b.createdAt)[0];
  if (waiting) schedule(waiting.localId, 300);
}

async function trySubmit(localId) {
  const job = find(localId);
  if (!job) return;
  patch(localId, { status: 'submitting' });
  try {
    const handle = await submitGeneration(job.endpoint, job.payload);
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

export function enqueue({ model, payload }) {
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
    status: 'submitting',
    outputs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs = [job, ...jobs].slice(0, MAX_JOBS);
  persist();
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
  await cancelRequest(job.requestId);
  patch(localId, { status: 'canceled' });
}

export function removeJob(localId) {
  clearTimeout(timers.get(localId));
  jobs = jobs.filter((j) => j.localId !== localId);
  persist();
}

export function clearFinished() {
  jobs = jobs.filter((j) => !TERMINAL.has(j.status) && j.status !== 'error');
  persist();
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

'use client';
// Sincroniza el historial y los personajes con Supabase cuando hay sesión.
// localStorage sigue siendo la caché local: la app funciona igual sin conexión.
import { currentUserId } from '../../auth';
import { supabase } from '../supabase';
import { apiFetch } from '../../api';

const pending = new Map();
let timer = null;

export function jobToRow(job, userId) {
  return {
    user_id: userId,
    local_id: job.localId,
    request_id: job.requestId || null,
    model_id: job.modelId,
    endpoint: job.endpoint,
    family: job.family,
    workflow: job.workflow,
    studio: job.studio,
    output: job.output,
    payload: job.payload || {},
    status: job.status,
    outputs: job.outputs || [],
    archived: job.archived || [],
    error: job.error || null,
    estimate: job.estimate || null,
    favorite: Boolean(job.favorite),
    label: job.label || null,
    group_id: job.group || null,
    parent_local_id: job.parent || null,
    then_step: job.then || null,
    chained_to: job.chainedTo || null,
    created_at: new Date(job.createdAt).toISOString(),
  };
}

export function rowToJob(row) {
  return {
    localId: row.local_id,
    requestId: row.request_id,
    modelId: row.model_id,
    endpoint: row.endpoint,
    family: row.family,
    workflow: row.workflow,
    studio: row.studio,
    output: row.output,
    payload: row.payload,
    status: row.status,
    outputs: row.outputs || [],
    archived: row.archived || [],
    error: row.error,
    estimate: row.estimate,
    favorite: row.favorite,
    label: row.label,
    group: row.group_id,
    parent: row.parent_local_id,
    then: row.then_step,
    chainedTo: row.chained_to,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

async function flush() {
  timer = null;
  const sb = supabase();
  const userId = currentUserId();
  if (!sb || !userId || !pending.size) return;
  const batch = [...pending.values()];
  pending.clear();
  const { error } = await sb.from('edavi_generations').upsert(batch.map((j) => jobToRow(j, userId)), { onConflict: 'user_id,local_id' });
  // Si falla (sin conexión), se reintenta en el siguiente cambio.
  if (error) for (const j of batch) if (!pending.has(j.localId)) pending.set(j.localId, j);
}

export async function flushNow() {
  clearTimeout(timer);
  await flush();
}

// Encola un trabajo para guardarlo en la nube (agrupa cambios cada 1,5 s).
export function saveJob(job) {
  if (!currentUserId()) return;
  pending.set(job.localId, job);
  if (!timer) timer = setTimeout(flush, 1500);
}

export async function deleteJobs(localIds) {
  const sb = supabase();
  if (!sb || !currentUserId() || !localIds.length) return;
  for (const id of localIds) pending.delete(id);
  await sb.from('edavi_generations').delete().in('local_id', localIds);
}

export async function fetchJobs(limit = 200) {
  const sb = supabase();
  if (!sb || !currentUserId()) return null;
  const { data, error } = await sb.from('edavi_generations').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return null;
  return data.map(rowToJob);
}

// ---------- Personajes ----------

export async function saveCharacter(c) {
  const sb = supabase();
  const userId = currentUserId();
  if (!sb || !userId) return;
  await sb.from('edavi_characters').upsert({
    id: c.id, user_id: userId, name: c.name, model_version: c.model_version, status: c.status,
    cover: c.cover || null, error: c.error || null, created_at: new Date(c.createdAt || Date.now()).toISOString(),
  }, { onConflict: 'user_id,id' });
}

export async function deleteCharacter(id) {
  const sb = supabase();
  if (!sb || !currentUserId()) return;
  await sb.from('edavi_characters').delete().eq('id', id);
}

export async function fetchCharacters() {
  const sb = supabase();
  if (!sb || !currentUserId()) return null;
  const { data, error } = await sb.from('edavi_characters').select('*').order('created_at', { ascending: false });
  if (error) return null;
  return data.map((r) => ({ id: r.id, name: r.name, model_version: r.model_version, status: r.status, cover: r.cover, error: r.error, createdAt: new Date(r.created_at).getTime() }));
}

// Copia los resultados al almacenamiento permanente (lo hace el servidor con tu sesión).
export async function archiveOutputs(localId) {
  return (await apiFetch('/api/archive', { method: 'POST', body: { localId } })).archived;
}

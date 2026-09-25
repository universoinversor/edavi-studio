'use client';
// Personajes Soul ID creados desde este navegador. Higgsfield los guarda en tu
// cuenta; aquí solo recordamos id, nombre y versión para poder elegirlos.
import { useSyncExternalStore } from 'react';
import { soulVersion } from './catalog';
import { generation, storage } from './providers';
import { friendlyError } from './errors';

const KEY = 'edavi.characters';
const EMPTY = [];
const DONE = new Set(['completed', 'failed']);
let list = EMPTY;
let loaded = false;
const listeners = new Set();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch { list = []; }
  for (const c of list) if (!DONE.has(c.status)) poll(c.id, 1000);
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin espacio */ }
  for (const l of listeners) l();
}

function patch(id, changes) {
  list = list.map((c) => (c.id === id ? { ...c, ...changes } : c));
  persist();
  const c = list.find((x) => x.id === id);
  if (c) storage.saveCharacter(c).catch(() => {});
}

async function syncFromCloud() {
  const remote = await storage.fetchCharacters();
  if (!remote) return;
  const byId = new Map(list.map((c) => [c.id, c]));
  for (const r of remote) byId.set(r.id, { ...byId.get(r.id), ...r });
  for (const c of list) if (!remote.some((r) => r.id === c.id)) storage.saveCharacter(c).catch(() => {});
  list = [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  persist();
  for (const c of list) if (!DONE.has(c.status)) poll(c.id, 1000);
}

if (typeof window !== 'undefined') {
  window.addEventListener('edavi:user', (e) => { if (e.detail?.userId) { load(); syncFromCloud(); } });
}

function poll(id, delay = 4000) {
  setTimeout(async () => {
    try {
      const r = await generation.getCharacter(id);
      patch(id, { status: r.status, error: r.error || null });
      if (!DONE.has(r.status)) poll(id, Math.min(delay * 1.4, 15000));
    } catch (err) {
      if (err.status === 404 || err.status === 401) patch(id, { status: 'failed', error: friendlyError(err) });
      else poll(id, Math.min(delay * 2, 30000));
    }
  }, delay);
}

export async function trainCharacter({ name, modelVersion, imageUrls }) {
  load();
  const res = await generation.createCharacter({
    name,
    model_version: modelVersion,
    input_images: imageUrls.map((url) => ({ type: 'image_url', image_url: url })),
  });
  const entry = { id: res.id, name, model_version: modelVersion, status: res.status || 'queued', cover: imageUrls[0], createdAt: Date.now() };
  list = [entry, ...list.filter((c) => c.id !== res.id)];
  persist();
  storage.saveCharacter(entry).catch(() => {});
  poll(res.id);
  return entry;
}

// Permite registrar un personaje creado en otro lugar (p. ej. la consola web).
export async function importCharacter(id, name, modelVersion) {
  load();
  const r = await generation.getCharacter(id.trim());
  const entry = { id: r.id || id.trim(), name: name || r.name || 'Personaje', model_version: r.model_version || modelVersion, status: r.status, createdAt: Date.now() };
  list = [entry, ...list.filter((c) => c.id !== entry.id)];
  persist();
  storage.saveCharacter(entry).catch(() => {});
  if (!DONE.has(entry.status)) poll(entry.id);
  return entry;
}

export function forgetCharacter(id) {
  list = list.filter((c) => c.id !== id);
  persist();
  storage.deleteCharacter(id).catch(() => {});
}

function subscribe(l) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useCharacters() {
  return useSyncExternalStore(subscribe, () => list, () => EMPTY);
}

// ---------- Avatar principal ----------
// El avatar marcado como principal se aplica solo en los modelos SOUL de su
// misma versión cuando el campo «Personaje (Soul ID)» está vacío.
const DEFAULT_KEY = 'edavi.avatar.default';

export function getDefaultAvatarId() {
  try { return localStorage.getItem(DEFAULT_KEY); } catch { return null; }
}

export function setDefaultAvatar(id) {
  try {
    if (id) localStorage.setItem(DEFAULT_KEY, id);
    else localStorage.removeItem(DEFAULT_KEY);
  } catch { /* sin almacenamiento */ }
  list = [...list];
  persist();
}

export function withDefaultAvatar(model, values) {
  if (!model?.schema?.properties?.custom_reference_id || values.custom_reference_id) return values;
  const id = getDefaultAvatarId();
  if (!id) return values;
  load();
  const avatar = list.find((c) => c.id === id && c.status === 'completed');
  if (!avatar || avatar.model_version !== soulVersion(model)) return values;
  return { ...values, custom_reference_id: id };
}

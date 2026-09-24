'use client';
// Cliente del navegador. Habla SOLO con el proxy propio (/api/hf/...),
// nunca directamente con api.higgsfield.ai.

const SETTINGS_KEY = 'edavi.settings';

export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}

export function saveSettings(next) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* almacenamiento no disponible */ }
  window.dispatchEvent(new CustomEvent('edavi:settings'));
}

function authHeaders() {
  const s = loadSettings();
  const h = {};
  if (s.credentials) h['x-hf-credentials'] = s.credentials;
  if (s.password) h['x-studio-password'] = s.password;
  return h;
}

export class HfError extends Error {
  constructor(status, detail, code) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

async function readError(res) {
  let body = null;
  try { body = await res.json(); } catch { /* sin cuerpo */ }
  return new HfError(res.status, body?.detail ?? res.statusText, body?.code);
}

export async function apiFetch(path, { method = 'GET', body, query } = {}) {
  const url = new URL(path.startsWith('/api/') ? path : `/api/hf/${path}`, window.location.origin);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await readError(res);
    if (res.status === 401) window.dispatchEvent(new CustomEvent('edavi:auth-required', { detail: { code: err.code } }));
    throw err;
  }
  if (res.status === 202 || res.status === 204) return null;
  return res.json();
}

export const submitGeneration = (endpoint, payload) => apiFetch(endpoint, { method: 'POST', body: payload });
export const getRequestStatus = (requestId) => apiFetch(`requests/${requestId}/status`);
export const cancelRequest = (requestId) => apiFetch(`requests/${requestId}/cancel`, { method: 'POST' });
export const listSoulStyles = (version) => apiFetch(version === 'v2' ? 'v1/text2image/soul-styles/v2' : 'v1/text2image/soul-styles');
export const listPresets = (search) => apiFetch('marketing-studio/image/presets', { query: { size: 100, search } });
export const createCharacter = (body) => apiFetch('v1/custom-references', { method: 'POST', body });
export const getCharacter = (id) => apiFetch(`v1/custom-references/${id}`);
export const getHealth = () => fetch('/api/health', { cache: 'no-store' }).then((r) => r.json());

// ---------- Subida de archivos ----------

const DIRECT_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4'],
  audio: ['audio/wav', 'audio/x-wav'],
};

async function imageToPng(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.png', { type: 'image/png' });
}

// Convierte lo que se pueda al formato admitido y rechaza el resto con un mensaje claro.
export async function normalizeFile(file) {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (Object.values(DIRECT_TYPES).flat().includes(type)) return type === file.type ? file : new File([file], file.name, { type });
  if (type.startsWith('image/')) return imageToPng(file);
  if (type.startsWith('video/')) throw new Error('Higgsfield solo acepta video MP4. Convierte el archivo a .mp4.');
  if (type.startsWith('audio/')) throw new Error('Higgsfield solo acepta audio WAV. Convierte el archivo a .wav.');
  throw new Error(`Tipo de archivo no admitido: ${file.type || file.name}`);
}

function putWithProgress(url, headers, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [k, v] of Object.entries(headers || {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new HfError(xhr.status, `La subida falló (${xhr.status}).`)));
    xhr.onerror = () => reject(new TypeError('network'));
    xhr.send(file);
  });
}

async function uploadViaServer(file) {
  const res = await fetch('/api/upload', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': file.type }, body: file });
  if (!res.ok) throw await readError(res);
  return (await res.json()).public_url;
}

// Sube un archivo y devuelve la URL pública que se pasa al modelo.
export async function uploadFile(rawFile, onProgress) {
  const file = await normalizeFile(rawFile);
  const presign = await apiFetch('files/generate-upload-url', { method: 'POST', body: { content_type: file.type } });
  try {
    await putWithProgress(presign.upload_url, presign.upload_headers, file, onProgress);
    return presign.public_url;
  } catch (err) {
    // Si el almacenamiento bloquea la subida directa (CORS), se sube a través del servidor.
    if (err instanceof TypeError) return uploadViaServer(file);
    throw err;
  }
}

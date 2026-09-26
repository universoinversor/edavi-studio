'use client';
// Transporte hacia el servidor propio de EDAVI (/api/*). No conoce ningún proveedor:
// añade la sesión y las credenciales del usuario y normaliza los errores.
import { accessToken } from './auth';

const SETTINGS_KEY = 'edavi.settings';

export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}

export function saveSettings(next) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* almacenamiento no disponible */ }
  window.dispatchEvent(new CustomEvent('edavi:settings'));
}

export function authHeaders() {
  const s = loadSettings();
  const h = {};
  if (s.credentials) h['x-hf-credentials'] = s.credentials;
  if (s.password) h['x-studio-password'] = s.password;
  const token = accessToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export class ApiError extends Error {
  constructor(status, detail, code, correlationId) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
    this.code = code;
    // Identificador de Higgsfield para soporte (cabecera X-Correlation-ID).
    this.correlationId = correlationId || null;
  }
}

export async function readError(res) {
  let body = null;
  try { body = await res.json(); } catch { /* sin cuerpo */ }
  return new ApiError(res.status, body?.detail ?? res.statusText, body?.code, res.headers.get('x-correlation-id'));
}

// Llamada JSON a una ruta del servidor propio. `silent` evita abrir el aviso de login.
/**
 * @param {string} path
 * @param {{ method?: string, body?: any, query?: Record<string, any>, silent?: boolean }} [opts]
 */
export async function apiFetch(path, { method = 'GET', body, query, silent = false } = {}) {
  const url = new URL(path, window.location.origin);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await readError(res);
    if (res.status === 401 && !silent) window.dispatchEvent(new CustomEvent('edavi:auth-required', { detail: { code: err.code } }));
    throw err;
  }
  if (res.status === 202 || res.status === 204) return null;
  return res.json();
}

export async function postBinary(path, file) {
  const res = await fetch(path, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': file.type }, body: file });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export const getHealth = () => fetch('/api/health', { cache: 'no-store' }).then((r) => r.json());

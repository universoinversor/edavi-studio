// Utilidades SOLO de servidor: credenciales, lista blanca de rutas y modo demo.
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import catalog from '../catalog.json';
import { allowOwnKeys, getUser, isAdmin, loginRequired } from './session';

export const HF_BASE = 'https://api.higgsfield.ai';
export const isMock = () => process.env.HF_MOCK === '1' || process.env.HF_MOCK === 'true';

const GENERATION_ENDPOINTS = new Set(catalog.models.map((m) => m.endpoint));
const UUID = '[0-9a-fA-F-]{36}';

const ALLOWED = {
  GET: [
    new RegExp(`^requests/${UUID}/status$`),
    /^v1\/custom-references(\/[\w-]+)?$/,
    /^v1\/text2image\/soul-styles(\/v2)?$/,
    /^marketing-studio\/image\/presets$/,
  ],
  POST: [
    new RegExp(`^requests/${UUID}/cancel$`),
    /^files\/generate-upload-url$/,
    /^v1\/custom-references$/,
  ],
};

// Solo se reenvían rutas conocidas: el proxy no puede usarse para otra cosa.
export function isAllowed(method, path) {
  if (method === 'POST' && GENERATION_ENDPOINTS.has(path)) return true;
  // Estimación de costo: POST /estimate/{endpoint de generación}
  if (method === 'POST' && path.startsWith('estimate/') && GENERATION_ENDPOINTS.has(path.slice(9))) return true;
  return (ALLOWED[method] || []).some((re) => re.test(path));
}

export function isGenerationPath(path) {
  return GENERATION_ENDPOINTS.has(path);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function serverHasCredentials() {
  return Boolean(process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET);
}

export function passwordRequired() {
  return Boolean(process.env.STUDIO_PASSWORD) && serverHasCredentials();
}

function ownKey(own) {
  const clean = own.trim();
  if (!/^[^:\s]+:[^:\s]+$/.test(clean)) {
    return { status: 401, error: 'El formato de la clave debe ser KEY_ID:KEY_SECRET.' };
  }
  return { authorization: `Key ${clean}` };
}

// Con Supabase configurado: hay que iniciar sesión. Los administradores (ADMIN_EMAILS)
// usan la clave del servidor; el resto solo su propia clave si ALLOW_OWN_KEYS=1.
async function resolveWithLogin(request) {
  const user = await getUser(request);
  if (!user) return { status: 401, error: 'Inicia sesión para generar.', code: 'login' };
  const own = request.headers.get('x-hf-credentials');
  const admin = isAdmin(user);
  if (own) {
    if (admin || allowOwnKeys()) return { ...ownKey(own), user };
    return { status: 403, error: 'Esta app es privada por ahora.', code: 'private' };
  }
  if (admin && serverHasCredentials()) {
    return { authorization: `Key ${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}`, user };
  }
  if (admin) return { status: 401, error: 'Faltan HF_API_KEY_ID y HF_API_KEY_SECRET en el servidor.', code: 'no_credentials' };
  if (allowOwnKeys()) return { status: 401, error: 'Añade tu clave de Higgsfield en Ajustes.', code: 'no_credentials' };
  return { status: 403, error: 'Esta app es privada por ahora.', code: 'private' };
}

// Devuelve { authorization } o { error, status }.
// Prioridad: clave propia del usuario (cabecera) → credenciales del servidor.
export async function resolveAuth(request) {
  if (loginRequired()) return resolveWithLogin(request);
  const own = request.headers.get('x-hf-credentials');
  if (own) {
    const clean = own.trim();
    if (!/^[^:\s]+:[^:\s]+$/.test(clean)) {
      return { status: 401, error: 'El formato de la clave debe ser KEY_ID:KEY_SECRET.' };
    }
    return { authorization: `Key ${clean}` };
  }
  if (serverHasCredentials()) {
    if (process.env.STUDIO_PASSWORD) {
      const given = request.headers.get('x-studio-password') || '';
      if (!safeEqual(given, process.env.STUDIO_PASSWORD)) {
        return { status: 401, error: 'Contraseña del estudio incorrecta.', code: 'password' };
      }
    }
    return { authorization: `Key ${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}` };
  }
  return { status: 401, error: 'No hay credenciales de Higgsfield configuradas.', code: 'no_credentials' };
}

export async function forward({ method, path, search = '', body, authorization, contentType }) {
  const headers = { Authorization: authorization, Accept: 'application/json' };
  if (contentType) headers['Content-Type'] = contentType;
  const res = await fetch(`${HF_BASE}/${path}${search}`, { method, headers, body, cache: 'no-store' });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { detail: text.slice(0, 500) }; }
  return { status: res.status, data, correlationId: res.headers.get('x-correlation-id') };
}

// Reescribe status_url / cancel_url para que apunten al proxy propio.
export function rewriteUrls(data) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  for (const key of ['status_url', 'cancel_url']) {
    if (typeof out[key] === 'string') out[key] = out[key].replace(HF_BASE, '/api/hf');
  }
  return out;
}

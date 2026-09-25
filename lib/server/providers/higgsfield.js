// Adaptador de servidor para la API de Higgsfield.
// Todo lo específico del proveedor (URL base, cabecera de auth, rutas permitidas,
// forma de subir archivos) vive aquí y en ningún otro sitio.
import 'server-only';
import catalog from '../../catalog.json';

const BASE = 'https://api.higgsfield.ai';
const PROXY = '/api/gen';
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

const authorization = (credentials) => `Key ${credentials}`;

async function call({ method, path, search = '', body, credentials, contentType }) {
  const headers = { Authorization: authorization(credentials), Accept: 'application/json' };
  if (contentType) headers['Content-Type'] = contentType;
  const res = await fetch(`${BASE}/${path}${search}`, { method, headers, body, cache: 'no-store' });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { detail: text.slice(0, 500) }; }
  return { status: res.status, data, correlationId: res.headers.get('x-correlation-id') };
}

// Reescribe status_url / cancel_url para que apunten al proxy propio.
function rewriteUrls(data) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  for (const key of ['status_url', 'cancel_url']) {
    if (typeof out[key] === 'string') out[key] = out[key].replace(BASE, PROXY);
  }
  return out;
}

export const higgsfield = {
  id: 'higgsfield',
  needsAuth: true,

  // Solo se reenvían rutas conocidas: el proxy no puede usarse para otra cosa.
  isAllowed(method, path) {
    if (method === 'POST' && GENERATION_ENDPOINTS.has(path)) return true;
    if (method === 'POST' && path.startsWith('estimate/') && GENERATION_ENDPOINTS.has(path.slice(9))) return true;
    return (ALLOWED[method] || []).some((re) => re.test(path));
  },

  async request({ method, path, search, body, credentials }) {
    const result = await call({
      method, path, search, credentials,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      contentType: body !== undefined ? 'application/json' : undefined,
    });
    const rewrite = GENERATION_ENDPOINTS.has(path) || path.startsWith('requests/');
    return rewrite ? { ...result, data: rewriteUrls(result.data) } : result;
  },

  // Pide una URL prefirmada y sube los bytes desde el servidor.
  async uploadBytes({ bytes, contentType, credentials }) {
    const presign = await call({
      method: 'POST', path: 'files/generate-upload-url', credentials,
      body: JSON.stringify({ content_type: contentType }), contentType: 'application/json',
    });
    if (presign.status >= 300) return { status: presign.status, data: presign.data };
    const { upload_url: uploadUrl, upload_headers: uploadHeaders = {}, public_url: publicUrl } = presign.data;
    const put = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: bytes });
    if (!put.ok) return { status: 502, data: { detail: `La subida al almacenamiento falló (${put.status}).` } };
    return { status: 200, data: { public_url: publicUrl } };
  },
};

// Simulador de la API de Higgsfield para probar el estudio sin gastar créditos.
// Se activa con HF_MOCK=1. Mantiene el estado en memoria del proceso.
import 'server-only';
import { randomUUID } from 'node:crypto';
import catalog from '../../catalog.json';
import { higgsfield } from './higgsfield';

const store = globalThis.__edaviMock || (globalThis.__edaviMock = { requests: new Map(), files: new Map(), refs: new Map() });
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

function handle(id) {
  return { request_id: id, status_url: `/api/gen/requests/${id}/status`, cancel_url: `/api/gen/requests/${id}/cancel` };
}

function statusOf(req) {
  if (req.canceled) return 'canceled';
  const t = Date.now() - req.createdAt;
  if (t < 1500) return 'queued';
  if (t < req.duration) return 'in_progress';
  return /\bfail\b/i.test(req.payload?.prompt || '') ? 'failed' : 'completed';
}

function mockRequest(method, path, body, origin = '') {
  if (method === 'POST' && path === 'files/generate-upload-url') {
    const id = randomUUID();
    return { status: 200, data: { public_url: `${origin}/api/mock-media/${id}`, upload_url: `${origin}/api/mock-media/${id}`, content_type: body?.content_type, upload_headers: { 'Content-Type': body?.content_type } } };
  }
  if (path === 'v1/text2image/soul-styles' || path === 'v1/text2image/soul-styles/v2') {
    return {
      status: 200,
      data: ['Editorial', 'Film 35mm', 'Neón nocturno', 'Retrato suave', 'Y2K', 'Street'].map((name, i) => ({
        id: `00000000-0000-4000-8000-00000000000${i}`, name, description: `Estilo de demostración ${name}.`,
        preview_url: `${origin}/api/mock-media/preview-${i}`,
      })),
    };
  }
  if (path === 'marketing-studio/image/presets') {
    return { status: 200, data: { total: 3, cursor: null, items: ['Producto editorial', 'Lifestyle', 'Estudio blanco'].map((name, i) => ({ id: `11111111-0000-4000-8000-00000000000${i}`, name, type: 'ads', metadata: { group_name: 'Demo' } })) } };
  }
  if (path === 'v1/custom-references' && method === 'POST') {
    const id = randomUUID();
    store.refs.set(id, { id, name: body?.name, model_version: body?.model_version || 'v1', createdAt: Date.now() });
    return { status: 200, data: { id, status: 'queued' } };
  }
  if (path.startsWith('v1/custom-references')) {
    const id = path.split('/')[2];
    const toView = (r) => ({ id: r.id, name: r.name, model_version: r.model_version, status: Date.now() - r.createdAt > 5000 ? 'completed' : 'in_progress' });
    if (!id) return { status: 200, data: [...store.refs.values()].map(toView) };
    const r = store.refs.get(id);
    return r ? { status: 200, data: toView(r) } : { status: 404, data: { detail: 'Not found' } };
  }
  const reqMatch = path.match(/^requests\/([\w-]+)\/(status|cancel)$/);
  if (reqMatch) {
    const req = store.requests.get(reqMatch[1]);
    if (!req) return { status: 404, data: { detail: 'Request not found' } };
    if (reqMatch[2] === 'cancel') {
      if (statusOf(req) !== 'queued') return { status: 400, data: { detail: 'Request is already processing' } };
      req.canceled = true;
      return { status: 202, data: null };
    }
    const status = statusOf(req);
    const data = { status, ...handle(req.id) };
    if (status === 'failed') data.error = 'Fallo simulado (el prompt contiene "fail").';
    if (status === 'completed') {
      if (req.output === 'video') data.video = { url: SAMPLE_VIDEO };
      else data.images = Array.from({ length: Number(req.payload?.batch_size) || 1 }, (_, i) => ({ url: `${origin}/api/mock-media/${req.id}-${i}` }));
    }
    return { status: 200, data };
  }
  if (path.startsWith('estimate/')) {
    const est = catalog.models.find((x) => x.endpoint === path.slice(9));
    const seconds = Number(body?.duration) || 5;
    const credits = est?.output === 'video' ? seconds * 1.2 : 1.5 * (Number(body?.batch_size) || 1);
    return { status: 200, data: { credits: credits.toFixed(3), usd: (credits * 0.0625).toFixed(3) } };
  }
  const model = catalog.models.find((m) => m.endpoint === path);
  if (model && method === 'POST') {
    const id = randomUUID();
    store.requests.set(id, { id, payload: body, output: model.output, createdAt: Date.now(), duration: model.output === 'video' ? 9000 : 4500 });
    return { status: 200, data: { status: 'queued', ...handle(id) } };
  }
  return { status: 404, data: { detail: 'Ruta no simulada' } };
}

export const mockFiles = store.files;

// Adaptador de demostración: misma interfaz que el de Higgsfield, sin credenciales.
export const mock = {
  id: 'mock',
  needsAuth: false,
  isAllowed: (method, path) => higgsfield.isAllowed(method, path),
  async request({ method, path, body, origin }) {
    return mockRequest(method, path, body, origin);
  },
  async uploadBytes({ bytes, contentType, origin }) {
    const id = randomUUID();
    store.files.set(id, { contentType, bytes });
    return { status: 200, data: { public_url: `${origin}/api/mock-media/${id}` } };
  },
};

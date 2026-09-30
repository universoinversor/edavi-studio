// Copia los resultados de una generación a Supabase Storage (bucket edavi-media).
// Higgsfield solo garantiza conservarlos 7 días. Actúa con el token del usuario (RLS).
// Lo usan /api/archive (a petición del navegador) y el proxy de estado, que archiva
// en segundo plano en cuanto Higgsfield confirma que terminó.
import 'server-only';
import { supabaseStorage as store } from './providers/storage.supabase';

const MAX_BYTES = 200 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' };

// Solo URLs https públicas: nada de IPs ni hosts internos.
function safeUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (/^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(u.hostname) || !u.hostname.includes('.')) return null;
    return u;
  } catch { return null; }
}

/**
 * Archiva una fila ya localizada. Devuelve { archived } o { error, status }.
 * @param {any} user
 * @param {{ local_id: string, outputs?: any[], archived?: any[] }} row
 * @param {any[]} [outputs] salidas conocidas (si la fila aún no las tiene guardadas)
 */
export async function archiveRow(user, row, outputs = row.outputs || []) {
  const archived = Array.isArray(row.archived) ? [...row.archived] : [];
  for (const [i, output] of outputs.entries()) {
    if (archived[i]?.url) continue;
    const source = safeUrl(output.url);
    if (!source) continue;
    const media = await fetch(source, { cache: 'no-store' });
    if (!media.ok) return { status: 410, error: `El proveedor ya no tiene el archivo ${i + 1} (${media.status}).` };
    const type = (media.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    if (!/^(image|video|audio)\//.test(type)) return { status: 415, error: 'El archivo no es imagen, video ni audio.' };
    const bytes = Buffer.from(await media.arrayBuffer());
    if (bytes.length > MAX_BYTES) return { status: 413, error: 'El archivo supera 200 MB.' };
    const path = `${user.id}/${row.local_id}-${i + 1}.${EXT[type] || type.split('/')[1] || 'bin'}`;
    const up = await store.putObject(user, path, bytes, type);
    if (!up.ok) return { status: 502, error: `No se pudo guardar en tu nube (${up.status}).` };
    archived[i] = { type: output.type, url: up.url };
  }
  await store.setArchived(user, row.local_id, archived);
  return { archived };
}

// Archivado en segundo plano a partir de la respuesta de estado de Higgsfield.
/** @param {any} user @param {string} requestId @param {any[]} outputs */
export async function archiveByRequest(user, requestId, outputs) {
  if (!outputs?.length) return;
  const row = await store.getGenerationByRequest(user, requestId);
  if (!row || (row.archived || []).length >= outputs.length) return;
  await archiveRow(user, row, outputs);
}

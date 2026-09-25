// Adaptador de almacenamiento del servidor (Supabase REST + Storage).
// Actúa siempre con el token del usuario, así que RLS limita cada acceso a lo suyo.
import 'server-only';
import { SB_URL, userHeaders } from '../session';

const BUCKET = 'edavi-media';

export const supabaseStorage = {
  id: 'supabase',

  async getGeneration(user, localId) {
    const res = await fetch(`${SB_URL}/rest/v1/edavi_generations?local_id=eq.${encodeURIComponent(localId)}&select=outputs,archived,status`, {
      headers: userHeaders(user), cache: 'no-store',
    });
    const [row] = res.ok ? await res.json() : [];
    return row || null;
  },

  // Devuelve la URL pública del objeto o null si falla.
  async putObject(user, path, bytes, contentType) {
    const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST', headers: userHeaders(user, { 'Content-Type': contentType, 'x-upsert': 'true' }), body: bytes,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, url: `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}` };
  },

  async setArchived(user, localId, archived) {
    await fetch(`${SB_URL}/rest/v1/edavi_generations?local_id=eq.${encodeURIComponent(localId)}`, {
      method: 'PATCH', headers: userHeaders(user, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ archived }),
    });
  },
};

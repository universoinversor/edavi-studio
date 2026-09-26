// Verificación de sesión de Supabase en el servidor (sin clave de servicio):
// se valida el token del usuario contra /auth/v1/user y se guarda 60 s en caché.
import 'server-only';

export const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const loginRequired = () => Boolean(SB_URL && SB_KEY);
export const allowOwnKeys = () => process.env.ALLOW_OWN_KEYS === '1' || process.env.ALLOW_OWN_KEYS === 'true';
export const allowSignup = () => process.env.NEXT_PUBLIC_ALLOW_SIGNUP === '1' || process.env.NEXT_PUBLIC_ALLOW_SIGNUP === 'true';

const cache = new Map();
const TTL = 60_000;

export function bearer(request) {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function getUser(request) {
  if (!loginRequired()) return null;
  const token = bearer(request);
  if (!token) return null;
  const hit = cache.get(token);
  if (hit && hit.expires > Date.now()) return hit.user;
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const user = { id: data.id, email: (data.email || '').toLowerCase(), token };
  if (cache.size > 500) cache.clear();
  cache.set(token, { user, expires: Date.now() + TTL });
  return user;
}

export function isAdmin(user) {
  if (!user) return false;
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes(user.email);
}

// Llamadas a la API REST de Supabase en nombre del usuario (respetan RLS).
export function userHeaders(user, extra = {}) {
  return { apikey: SB_KEY, Authorization: `Bearer ${user.token}`, ...extra };
}

// Llama a una función RPC de Supabase con la sesión del usuario (respeta sus permisos).
export async function userRpc(user, fn, args = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: userHeaders(user, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) return undefined;
  return res.json();
}

// Administrador: por ADMIN_EMAILS o por la tabla edavi_admins (se consulta 60 s en caché).
const adminCache = new Map();
export async function isAdminUser(user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const hit = adminCache.get(user.id);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = (await userRpc(user, 'edavi_is_admin')) === true;
  if (adminCache.size > 500) adminCache.clear();
  adminCache.set(user.id, { value, expires: Date.now() + 60_000 });
  return value;
}

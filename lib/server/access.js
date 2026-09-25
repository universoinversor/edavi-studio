// Política de acceso del servidor: quién puede generar y con qué credenciales.
// No sabe nada del proveedor: devuelve credenciales en bruto («id:secret») y
// cada adaptador las convierte a su cabecera (ver lib/server/providers).
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { allowOwnKeys, getUser, isAdmin, loginRequired } from './session';

const CREDENTIALS = /^[^:\s]+:[^:\s]+$/;

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

const serverCredentials = () => `${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}`;

function ownKey(own) {
  const clean = own.trim();
  if (!CREDENTIALS.test(clean)) return { status: 401, error: 'El formato de la clave debe ser KEY_ID:KEY_SECRET.' };
  return { credentials: clean };
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
  if (admin && serverHasCredentials()) return { credentials: serverCredentials(), user };
  if (admin) return { status: 401, error: 'Faltan HF_API_KEY_ID y HF_API_KEY_SECRET en el servidor.', code: 'no_credentials' };
  if (allowOwnKeys()) return { status: 401, error: 'Añade tu clave de Higgsfield en Ajustes.', code: 'no_credentials' };
  return { status: 403, error: 'Esta app es privada por ahora.', code: 'private' };
}

// Devuelve { credentials } o { error, status, code }.
export async function resolveAuth(request) {
  if (loginRequired()) return resolveWithLogin(request);
  const own = request.headers.get('x-hf-credentials');
  if (own) return ownKey(own);
  if (serverHasCredentials()) {
    if (process.env.STUDIO_PASSWORD) {
      const given = request.headers.get('x-studio-password') || '';
      if (!safeEqual(given, process.env.STUDIO_PASSWORD)) {
        return { status: 401, error: 'Contraseña del estudio incorrecta.', code: 'password' };
      }
    }
    return { credentials: serverCredentials() };
  }
  return { status: 401, error: 'No hay credenciales de Higgsfield configuradas.', code: 'no_credentials' };
}

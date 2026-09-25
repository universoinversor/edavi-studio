'use client';
// Inicio de sesión con Supabase (opcional). Si no hay variables de Supabase,
// la app funciona igual que antes, solo en este navegador.
import { useSyncExternalStore } from 'react';
import { supabase, supabaseEnabled } from './providers/supabase';
import { COPY } from './copy';
import { BRAND } from './brand';

export const authEnabled = supabaseEnabled;
export { supabase };

let session = null;
let ready = !authEnabled;
const listeners = new Set();
let started = false;

let announced;
function emit() {
  for (const l of listeners) l();
  // Avisa a los almacenes (historial, personajes) cuando cambia el usuario.
  const id = session?.user?.id || null;
  if (ready && id !== announced) {
    announced = id;
    window.dispatchEvent(new CustomEvent('edavi:user', { detail: { userId: id } }));
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const sb = supabase();
  if (!sb) { ready = true; emit(); return; }
  sb.auth.getSession().then(({ data }) => { session = data.session; ready = true; emit(); });
  sb.auth.onAuthStateChange((event, next) => {
    session = next;
    ready = true;
    emit();
    // El usuario llegó desde el enlace de «recuperar contraseña».
    if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new CustomEvent('edavi:password-recovery'));
  });
}

export function accessToken() {
  start();
  return session?.access_token || null;
}

export function currentUserId() {
  return session?.user?.id || null;
}

const snapshot = { session: null, ready: false };
let last = snapshot;
function getSnapshot() {
  if (last.session !== session || last.ready !== ready) last = { session, ready };
  return last;
}

export function useAuth() {
  return useSyncExternalStore(
    (l) => { start(); listeners.add(l); return () => listeners.delete(l); },
    getSnapshot,
    () => snapshot,
  );
}

// Traduce los errores de Supabase Auth a textos de producto.
function authError(error) {
  const t = COPY.auth.errors;
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login')) return new Error(t.invalid);
  if (msg.includes('password') && (msg.includes('least') || msg.includes('short') || msg.includes('weak'))) return new Error(t.weak);
  if (msg.includes('email') && msg.includes('invalid')) return new Error(t.email);
  if (error?.status === 429 || msg.includes('rate')) return new Error(t.rate);
  return new Error(t.generic);
}

const redirectTo = () => (typeof window !== 'undefined' ? window.location.origin : BRAND.url);

export async function signIn(email, password) {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw authError(error);
}

// Devuelve true si la cuenta queda activa ya (sin confirmación por email).
export async function signUp(email, password) {
  if (password.length < 8) throw new Error(COPY.auth.errors.weak);
  const { data, error } = await supabase().auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
  if (error) throw authError(error);
  return Boolean(data.session);
}

export async function requestPasswordReset(email) {
  const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw authError(error);
}

export async function updatePassword(password) {
  if (password.length < 8) throw new Error(COPY.auth.errors.weak);
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw authError(error);
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

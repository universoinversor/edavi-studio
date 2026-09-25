'use client';
// Inicio de sesión con Supabase (opcional). Si no hay variables de Supabase,
// la app funciona igual que antes, solo en este navegador.
import { useSyncExternalStore } from 'react';
import { supabase, supabaseEnabled } from './providers/supabase';

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
  sb.auth.onAuthStateChange((_event, next) => {
    session = next;
    ready = true;
    emit();
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

export async function signIn(email, password) {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error.message);
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

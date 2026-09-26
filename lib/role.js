'use client';
// Rol del usuario actual:
//   · admin     → crea, gestiona la galería, las solicitudes y la clave del proveedor
//   · member    → sesión iniciada sin permisos de creación (por ahora solo mira)
//   · guest     → visitante: ve la app y la galería pública y puede solicitar acceso
// Sin Supabase (modo local/demo) todo el mundo puede crear, como antes.
import { useSyncExternalStore } from 'react';
import { authEnabled, currentUserId } from './auth';
import { storage } from './providers';

let state = { role: authEnabled ? 'guest' : 'admin', ready: !authEnabled };
const listeners = new Set();
let started = false;

function set(next) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

async function refresh() {
  if (!authEnabled) return;
  if (!currentUserId()) { set({ role: 'guest', ready: true }); return; }
  const admin = await storage.fetchIsAdmin();
  set({ role: admin ? 'admin' : 'member', ready: true });
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('edavi:user', refresh);
  refresh();
}

export function useRole() {
  const snap = useSyncExternalStore(
    (l) => { start(); listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
  return { ...snap, isAdmin: snap.role === 'admin', canCreate: snap.role === 'admin' };
}

// Abre el formulario «Solicitar acceso» desde cualquier parte de la app.
export function requestAccess() {
  window.dispatchEvent(new CustomEvent('edavi:request-access'));
}

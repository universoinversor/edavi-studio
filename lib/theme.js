'use client';
// Tema claro (blanco + dorado) / oscuro (morado). Se guarda en este navegador.
import { useSyncExternalStore } from 'react';

const KEY = 'edavi.theme';
const listeners = new Set();

function current() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* sin almacenamiento */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f2ec' : '#07060b');
  for (const l of listeners) l();
}

export function useTheme() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, current, () => 'dark');
}

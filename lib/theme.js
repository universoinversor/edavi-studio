'use client';
// Tema claro (blanco + dorado) / oscuro (morado). Se guarda en este navegador.
import { useSyncExternalStore } from 'react';
import { BRAND } from './brand';

const KEY = 'edavi.theme';
const listeners = new Set();

function current() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* sin almacenamiento */ }
  // El color de la barra del navegador sigue al tema elegido.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', theme === 'light' ? BRAND.colors.light.background : BRAND.colors.dark.background);
  }
  for (const l of listeners) l();
}

export function useTheme() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, current, () => 'dark');
}

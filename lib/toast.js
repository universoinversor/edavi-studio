'use client';
// Avisos breves (toasts). Se anuncian con aria-live y se cierran solos.
import { useSyncExternalStore } from 'react';

const EMPTY = [];
let toasts = EMPTY;
const listeners = new Set();
const emit = () => { for (const l of listeners) l(); };

/**
 * @param {string} message
 * @param {{ tone?: 'info'|'success'|'error', action?: { label: string, onClick: () => void }, duration?: number }} [opts]
 */
export function toast(message, { tone = 'info', action, duration = 5000 } = {}) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  toasts = [...toasts, { id, message, tone, action }].slice(-4);
  emit();
  if (duration) setTimeout(() => dismiss(id), duration);
  return id;
}

export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => toasts, () => EMPTY);
}

'use client';
// Recuerda si esta persona ya vio la bienvenida (por dispositivo).
const KEY = 'edavi.onboarded';

export function needsOnboarding() {
  try { return localStorage.getItem(KEY) !== '1'; } catch { return false; }
}

export function completeOnboarding() {
  try { localStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
}

export function resetOnboarding() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}

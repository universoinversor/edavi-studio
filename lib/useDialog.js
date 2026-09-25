'use client';
// Comportamiento accesible para modales: cierra con Esc, atrapa el foco con Tab,
// enfoca el primer control al abrir y devuelve el foco al cerrar.
import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {(() => void) | null | undefined} onClose
 * @param {{ initialFocus?: boolean, enabled?: boolean }} [opts]
 * @returns {import('react').MutableRefObject<any>}
 */
export function useDialog(onClose, { initialFocus = true, enabled = true } = {}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled) return undefined;
    const previous = /** @type {HTMLElement|null} */ (document.activeElement);
    const node = ref.current;
    if (initialFocus && node) {
      const first = /** @type {HTMLElement|null} */ (node.querySelector('[data-autofocus]') || node.querySelector(FOCUSABLE));
      first?.focus({ preventScroll: true });
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== 'Tab' || !node) return;
      /** @type {HTMLElement[]} */
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => /** @type {HTMLElement} */ (el).offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, [initialFocus, enabled]);

  return ref;
}

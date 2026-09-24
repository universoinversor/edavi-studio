'use client';
import { createPortal } from 'react-dom';

// Los modales se montan en <body> para que ninguna animación o `sticky`
// de sus contenedores los recorte o los deje por detrás.
export default function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

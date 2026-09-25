// Traduce errores del proveedor a mensajes útiles (textos en lib/copy.js).
import { COPY } from './copy.js';

function detailText(detail) {
  if (Array.isArray(detail)) {
    // Errores de validación de FastAPI: [{ loc: [...], msg: '...' }]
    return detail.map((d) => {
      const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '';
      return field ? `${field}: ${d.msg}` : d.msg;
    }).join(' · ');
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return String(detail || '');
}

export function isConcurrencyError(err) {
  return err?.status === 400 && /concurrent/i.test(detailText(err.detail));
}

export function friendlyError(err) {
  const t = COPY.errors;
  if (!err) return t.unknown;
  const detail = detailText(err.detail ?? err.message);
  switch (err.status) {
    case 401:
      if (err.code === 'login') return t.login;
      if (err.code === 'password') return t.password;
      if (err.code === 'no_credentials') return t.noCredentials;
      return t.badCredentials;
    case 403: return err.code === 'private' ? t.private : t.credits;
    case 404: return t.notFound;
    case 413: return t.tooLarge;
    case 415: return detail;
    case 422: return t.rejected(detail);
    case 423: return t.locked;
    case 503: return t.disabled;
    case 502: return detail || t.unreachable;
    default:
      if (isConcurrencyError(err)) return t.concurrency;
      if (err.status >= 500) return t.server;
      return detail || err.message || t.unknown;
  }
}

export function statusLabel(status) {
  return COPY.status[status] || status;
}

// Traduce errores de Higgsfield a mensajes útiles en español.

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
  if (!err) return 'Error desconocido.';
  const detail = detailText(err.detail ?? err.message);
  switch (err.status) {
    case 401:
      if (err.code === 'password') return 'Contraseña del estudio incorrecta. Revísala en Ajustes.';
      if (err.code === 'no_credentials') return 'Falta tu clave de Higgsfield. Añádela en Ajustes.';
      return 'Credenciales de Higgsfield no válidas. Revisa KEY_ID:KEY_SECRET en Ajustes.';
    case 403: return 'No tienes créditos suficientes en Higgsfield. Recarga en console.higgsfield.ai.';
    case 404: return 'Este modelo no está disponible para tu cuenta (o la solicitud no existe).';
    case 413: return 'El archivo es demasiado grande.';
    case 415: return detail;
    case 422: return `Parámetros rechazados por el modelo: ${detail}`;
    case 423: return 'El modelo está bloqueado temporalmente. Inténtalo más tarde.';
    case 503: return 'El modelo está desactivado o no está listo. Inténtalo más tarde.';
    case 502: return detail || 'No se pudo contactar con Higgsfield.';
    default:
      if (isConcurrencyError(err)) return 'Llegaste al máximo de generaciones simultáneas. Se enviará en cuanto termine otra.';
      if (err.status >= 500) return 'Error del servidor de Higgsfield. Reintenta en unos segundos.';
      return detail || err.message || 'Error desconocido.';
  }
}

export function statusLabel(status) {
  return {
    local_queue: 'En cola local',
    submitting: 'Enviando',
    queued: 'En cola',
    in_progress: 'Revelando',
    completed: 'Listo',
    failed: 'Falló',
    nsfw: 'Bloqueado por moderación',
    canceled: 'Cancelado',
    error: 'Error',
  }[status] || status;
}

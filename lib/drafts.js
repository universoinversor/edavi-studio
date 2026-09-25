'use client';
// Borradores del compositor por estudio: si recargas o cambias de sección,
// recuperas el modelo y lo que estabas escribiendo.
const key = (studio) => `edavi.draft.${studio}`;

export function loadDraft(studio) {
  try {
    const d = JSON.parse(localStorage.getItem(key(studio)));
    return d && d.modelId && d.values ? d : null;
  } catch { return null; }
}

export function saveDraft(studio, modelId, values) {
  try { localStorage.setItem(key(studio), JSON.stringify({ modelId, values, savedAt: Date.now() })); } catch { /* sin espacio */ }
}

export function clearDraft(studio) {
  try { localStorage.removeItem(key(studio)); } catch { /* ignorar */ }
}

// Un borrador vale la pena si tiene texto o algún archivo subido.
export function hasContent(values) {
  return Object.entries(values || {}).some(([k, v]) =>
    (k === 'prompt' && String(v || '').trim()) || (/_urls?$/.test(k) && (Array.isArray(v) ? v.length : Boolean(v))));
}

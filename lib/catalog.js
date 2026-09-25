import data from './catalog.json';
import { FAMILY_ES } from './descriptions.es';
import { COPY } from './copy';

export const catalog = data;
// Se añade la descripción en español sin tocar el JSON sincronizado.
export const models = data.models.map((m) => ({ ...m, familyDescription: FAMILY_ES[m.familyId] || m.familyDescription }));

// Secciones de la app (orden de navegación). Textos en lib/copy.js.
const STUDIO_IDS = ['explore', 'image', 'video', 'transform', 'characters', 'prompts', 'library'];
export const STUDIOS = STUDIO_IDS.map((id, i) => ({ id, kicker: String(i).padStart(2, '0'), ...COPY.studios[id] }));

const WORKFLOW_WORDS = [
  [/text to video/i, 'Texto a video'],
  [/image to video/i, 'Imagen a video'],
  [/reference to video/i, 'Referencias a video'],
  [/text to image/i, 'Texto a imagen'],
  [/first last frame/i, 'Primer y último fotograma'],
  [/image reference/i, 'Referencia de imagen'],
  [/video reference/i, 'Referencia de video'],
  [/video edit/i, 'Editar video'],
  [/video extend/i, 'Extender video'],
  [/edit images/i, 'Editar imágenes'],
  [/generate and edit/i, 'Generar y editar'],
  [/motion transfer/i, 'Transferir movimiento'],
  [/object swap/i, 'Cambiar objeto'],
  [/^generate$/i, 'Generar'],
];

export function workflowLabel(workflow) {
  let label = workflow;
  for (const [re, es] of WORKFLOW_WORDS) label = label.replace(re, es);
  return label.replace(/\bStandard\b/g, 'Estándar').replace(/\bfast\b/g, 'rápido');
}

export function modelsForStudio(studio) {
  return models.filter((m) => m.studio === studio);
}

// Agrupa por familia conservando el orden del catálogo.
export function familiesForStudio(studio) {
  const map = new Map();
  for (const m of modelsForStudio(studio)) {
    if (!map.has(m.familyId)) map.set(m.familyId, { id: m.familyId, name: m.family, description: m.familyDescription, models: [] });
    map.get(m.familyId).models.push(m);
  }
  return [...map.values()];
}

export function getModel(id) {
  return models.find((m) => m.id === id);
}

// Modelos preferidos al abrir cada estudio.
export const DEFAULT_MODEL = {
  image: 'soul-2/generate',
  video: 'seedance-2-5/text-to-video',
  transform: 'kling-3-motion-control/pro',
};

export function defaultModelFor(studio) {
  return getModel(DEFAULT_MODEL[studio]) || modelsForStudio(studio)[0];
}

// SOUL: qué versión de estilos/personajes usa cada endpoint.
export function soulVersion(model) {
  if (!model) return null;
  if (model.endpoint.includes('soul/v2')) return 'v2';
  if (model.endpoint.includes('soul/cinema')) return 'cinema';
  if (model.endpoint.includes('soul/standard')) return 'v1';
  return null;
}

// Modelos destacados en la portada «Explorar» (con su etiqueta).
export const FEATURED = [
  { studio: 'video', family: 'seedance-2-5', badge: 'TOP' },
  { studio: 'image', family: 'soul-2', badge: 'TOP' },
  { studio: 'transform', family: 'kling-3-motion-control', badge: 'NUEVO' },
  { studio: 'video', family: 'kling-3', badge: null },
  { studio: 'video', family: 'cinema-studio-4', badge: 'NUEVO' },
  { studio: 'video', family: 'wan-3', badge: null },
  { studio: 'image', family: 'marketing-studio-image', badge: null },
  { studio: 'video', family: 'minimax-h3', badge: null },
  { studio: 'transform', family: 'genjutsu', badge: 'NUEVO' },
];

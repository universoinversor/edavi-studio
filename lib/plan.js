// Lógica pura de las funciones avanzadas: variaciones, comparación de modelos
// y flujos encadenados. Sin DOM, para poder probarla con `npm test`.
import { buildPayload, defaultValues, unwrap, validatePayload } from './schema.js';

// Conserva lo que el usuario ya escribió al cambiar de modelo, si el nuevo lo admite.
export function carryValues(model, previous) {
  const next = defaultValues(model.schema);
  for (const [key, value] of Object.entries(previous || {})) {
    const raw = model.schema.properties[key];
    if (!raw || value === undefined) continue;
    const prop = unwrap(raw);
    if (prop.enum && !prop.enum.includes(value)) continue;
    if (prop.type === 'array' && !Array.isArray(value)) continue;
    if (prop.type === 'string' && typeof value !== 'string') continue;
    next[key] = value;
  }
  return next;
}

// Devuelve N payloads; si el modelo acepta semilla y no fijaste una, cada copia
// recibe una semilla distinta para que las variaciones no salgan iguales.
export function variationPayloads(model, payload, count, random = Math.random) {
  const n = Math.max(1, Math.min(4, Number(count) || 1));
  const seedProp = model.schema.properties.seed ? unwrap(model.schema.properties.seed) : null;
  if (n === 1 || !seedProp || payload.seed !== undefined) return Array.from({ length: n }, () => ({ ...payload }));
  const min = seedProp.minimum ?? 1;
  const max = Math.min(seedProp.maximum ?? 1_000_000, 2_147_483_647);
  const seeds = new Set();
  while (seeds.size < n) seeds.add(min + Math.floor(random() * (max - min)));
  return [...seeds].map((seed) => ({ ...payload, seed }));
}

// Para «Comparar»: en cada otra familia del estudio, el primer modo que acepta
// lo que ya rellenaste sin pedir nada más.
export function compareCandidates(models, current, values) {
  const byFamily = new Map();
  for (const m of models) {
    if (m.studio !== current.studio || m.familyId === current.familyId || byFamily.has(m.familyId)) continue;
    const payload = buildPayload(m.schema, carryValues(m, values));
    if (validatePayload(m.schema, payload).length === 0) byFamily.set(m.familyId, { model: m, payload });
  }
  return [...byFamily.values()];
}

// Modelos de video capaces de animar una imagen (para el flujo imagen → video).
export function animateTargets(models) {
  return models.filter((m) => m.studio === 'video' && m.output === 'video'
    && (m.schema.required || []).includes('image_url') && m.schema.properties.prompt);
}

// Prepara el trabajo encadenado a partir del resultado del anterior.
export function chainedPayload(model, values, outputUrl, inputKey = 'image_url') {
  return buildPayload(model.schema, { ...carryValues(model, values), [inputKey]: outputUrl });
}

export const INSPIRATION = {
  image: [
    'Retrato editorial de una mujer con abrigo de terciopelo morado, luz de ventana suave, grano de película 35 mm',
    'Zapatilla deportiva flotando sobre un charco que refleja luces de neón, fotografía de producto, fondo oscuro',
    'Cartel minimalista de un festival de jazz, tipografía grande, formas geométricas violetas y crema',
    'Chef sonriendo en una cocina de mercado en Ciudad de México, luz dorada de la tarde, estilo documental',
    'Habitación brutalista con una piscina interior y cielo rosado al atardecer, render arquitectónico',
    'Retrato de un astronauta anciano en un campo de lavanda, estilo cinematográfico, profundidad de campo baja',
  ],
  video: [
    'Travelling lento hacia una bailarina que gira bajo lluvia de confeti morado, cámara lenta, luz de concierto',
    'Dron que sobrevuela un acantilado al amanecer mientras la niebla se abre y revela el mar',
    'Primer plano de café vertido en una taza de cerámica, vapor en contraluz, macro, 120 fps',
    'Un gato con gafas de sol conduce un descapotable por la costa, plano de seguimiento lateral',
    'Timelapse de una ciudad futurista que pasa del día a la noche, luces violetas que se encienden',
    'Una modelo camina por una pasarela de agua; la cámara la sigue en un plano de grúa descendente',
  ],
  transform: [
    'Mantén el movimiento del video original pero convierte al personaje en una estatua de mármol',
    'Cambia la ropa por un traje futurista de neón morado sin alterar el movimiento',
    'Transforma la escena en una animación de acuarela conservando la cámara',
    'Sustituye el fondo por un bosque nevado de noche con luces cálidas',
  ],
};

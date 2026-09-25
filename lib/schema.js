// Convierte los JSON Schema oficiales de Higgsfield en controles de formulario,
// payloads listos para enviar y mensajes de validación en español.
// Todo es puro (sin DOM) para poder probarlo con `npm test`.

const LABELS = {
  prompt: 'Prompt',
  negative_prompt: 'Prompt negativo',
  image_url: 'Imagen',
  image_urls: 'Imágenes de referencia',
  end_image_url: 'Fotograma final',
  last_image_url: 'Fotograma final',
  first_frame_url: 'Fotograma inicial',
  last_frame_url: 'Fotograma final',
  image_reference_url: 'Imagen de referencia',
  video_url: 'Video',
  video_urls: 'Videos de referencia',
  audio_url: 'Audio',
  audio_urls: 'Audios de referencia',
  file_url: 'Archivo (URL)',
  link_url: 'Enlace (URL)',
  aspect_ratio: 'Formato',
  resolution: 'Resolución',
  duration: 'Duración',
  quality: 'Calidad',
  seed: 'Semilla',
  batch_size: 'Cantidad',
  mode: 'Modo',
  sound: 'Sonido',
  generate_audio: 'Generar audio',
  keep_original_sound: 'Mantener sonido original',
  character_orientation: 'Orientación del personaje',
  cfg_scale: 'Fidelidad al prompt',
  enhance_prompt: 'Mejorar prompt',
  prompt_extend: 'Ampliar prompt',
  prompt_extend_mode: 'Modo de ampliación',
  prompt_optimizer: 'Optimizar prompt',
  enable_thinking: 'Razonamiento',
  style_id: 'Estilo',
  style_strength: 'Intensidad del estilo',
  custom_reference_id: 'Personaje (Soul ID)',
  custom_reference_strength: 'Intensidad del personaje',
  preset_id: 'Preset',
  moderation: 'Moderación',
  multi_shots: 'Varias tomas',
  multi_prompt: 'Tomas',
  shot_type: 'Tipo de tomas',
  elements: 'Elementos Kling (IDs)',
  colors: 'Paleta',
  background_color: 'Color de fondo',
  output_format: 'Formato de salida',
  bitrate_mode: 'Bitrate',
  fps: 'FPS',
  camera_movement: 'Movimiento de cámara',
  camera_model: 'Cámara',
  camera_lens: 'Lente',
  camera_aperture: 'Apertura',
  color_palette: 'Paleta de color',
  genre: 'Género',
  era: 'Época',
  light: 'Iluminación',
  pacing: 'Ritmo',
  aigc_watermark: 'Marca de agua IA',
  image_weight: 'Peso de la imagen',
  rendering_speed: 'Velocidad de render',
  name: 'Nombre',
};

const ENUM_LABELS = {
  on: 'Sí', off: 'No', yes: 'Sí', no: 'No',
  std: 'Estándar', pro: 'Pro', standard: 'Estándar', high: 'Alta', low: 'Baja', medium: 'Media',
  xhigh: 'Muy alta', max: 'Máxima', auto: 'Auto', adaptive: 'Adaptativo',
  TURBO: 'Turbo', DEFAULT: 'Normal', QUALITY: 'Calidad',
  customize: 'Personalizadas', intelligent: 'Automáticas',
  image: 'Según imagen', video: 'Según video', direct: 'Directo', agent: 'Agente',
};

// Campos que se muestran bajo "Avanzado" para no abrumar.
const ADVANCED = new Set([
  'seed', 'negative_prompt', 'cfg_scale', 'bitrate_mode', 'aigc_watermark', 'fps', 'prompt_optimizer',
  'moderation', 'prompt_extend', 'prompt_extend_mode', 'enable_thinking', 'style_strength',
  'custom_reference_strength', 'image_weight', 'output_format', 'elements', 'file_url', 'link_url',
  'keep_original_sound', 'character_orientation',
]);

const PRIMARY_ORDER = ['mode', 'aspect_ratio', 'resolution', 'duration', 'quality', 'batch_size', 'sound', 'generate_audio', 'rendering_speed'];

export function humanize(key) {
  return LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function enumLabel(value) {
  if (typeof value === 'number') return String(value);
  if (ENUM_LABELS[value]) return ENUM_LABELS[value];
  return String(value).replace(/[-_]/g, ' ');
}

// Quita el `anyOf: [X, null]` que usan los modelos SOUL.
export function unwrap(prop) {
  if (!prop?.anyOf) return prop;
  const real = prop.anyOf.find((p) => p.type !== 'null') || {};
  return { ...real, default: prop.default ?? real.default, title: prop.title };
}

export function mediaAcceptFor(key) {
  if (/video/.test(key)) return 'video';
  if (/audio/.test(key)) return 'audio';
  return 'image';
}

export function classifyField(key, rawProp) {
  const prop = unwrap(rawProp);
  /** @type {{ key: string, label: string, prop: any, advanced: boolean, required?: boolean, accept?: string, kind?: string }} */
  const base = { key, label: humanize(key), prop, advanced: ADVANCED.has(key) };
  if (key === 'prompt' || key === 'negative_prompt') return { ...base, kind: 'text' };
  if (key === 'style_id') return { ...base, kind: 'style' };
  if (key === 'preset_id') return { ...base, kind: 'preset' };
  if (key === 'custom_reference_id') return { ...base, kind: 'reference' };
  if (key === 'multi_prompt') return { ...base, kind: 'shots' };
  if (key === 'colors') return { ...base, kind: 'colors' };
  if (key === 'background_color') return { ...base, kind: 'color' };
  if (key === 'file_url' || key === 'link_url') return { ...base, kind: 'url' };
  if (prop.type === 'string' && /_url$/.test(key)) return { ...base, kind: 'media', accept: mediaAcceptFor(key) };
  if (prop.type === 'array' && /_urls$/.test(key)) return { ...base, kind: 'mediaList', accept: mediaAcceptFor(key) };
  if (prop.type === 'array' && prop.items?.type === 'string') return { ...base, kind: 'tags' };
  if (prop.enum) return { ...base, kind: 'enum' };
  if (prop.type === 'boolean') return { ...base, kind: 'toggle' };
  if (key === 'seed') return { ...base, kind: 'seed' };
  if ((prop.type === 'integer' || prop.type === 'number') && prop.minimum !== undefined && prop.maximum !== undefined) {
    return { ...base, kind: 'range' };
  }
  if (prop.type === 'integer' || prop.type === 'number') return { ...base, kind: 'number' };
  if (prop.type === 'string') return { ...base, kind: 'string' };
  return { ...base, kind: 'json' };
}

// Devuelve los campos agrupados tal como los pinta el formulario.
export function describeFields(schema) {
  const fields = Object.entries(schema?.properties || {}).map(([k, p]) => classifyField(k, p));
  const required = new Set(schema?.required || []);
  for (const f of fields) f.required = required.has(f.key);
  const prompt = fields.find((f) => f.key === 'prompt') || null;
  const media = fields.filter((f) => f.kind === 'media' || f.kind === 'mediaList');
  const rest = fields.filter((f) => f !== prompt && !media.includes(f));
  const primary = rest.filter((f) => !f.advanced)
    .sort((a, b) => rank(a.key) - rank(b.key));
  const advanced = rest.filter((f) => f.advanced);
  // Las entradas obligatorias van primero (p. ej. image_url en imagen a video).
  media.sort((a, b) => Number(b.required) - Number(a.required));
  return { prompt, media, primary, advanced, all: fields };
}

function rank(key) {
  const i = PRIMARY_ORDER.indexOf(key);
  return i === -1 ? PRIMARY_ORDER.length : i;
}

export function defaultValues(schema) {
  const values = {};
  for (const [key, raw] of Object.entries(schema?.properties || {})) {
    const prop = unwrap(raw);
    if (prop.default !== undefined && prop.default !== null) values[key] = prop.default;
  }
  return values;
}

function isEmpty(v) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function coerce(prop, value) {
  if (prop.type === 'integer') return Number.parseInt(value, 10);
  if (prop.type === 'number') return Number(value);
  return value;
}

// Construye el cuerpo exacto que se envía a Higgsfield: solo claves del schema,
// sin vacíos y con los tipos correctos.
export function buildPayload(schema, values) {
  const payload = {};
  for (const [key, raw] of Object.entries(schema?.properties || {})) {
    const prop = unwrap(raw);
    let v = values[key];
    if (typeof v === 'string') v = v.trim();
    if (key === 'multi_prompt' && Array.isArray(v)) {
      v = v.filter((s) => s && String(s.prompt || '').trim())
        .map((s) => ({ prompt: String(s.prompt).trim(), duration: Number.parseInt(s.duration, 10) || 1 }));
    }
    if (Array.isArray(v) && prop.items?.type === 'string') v = v.map((s) => String(s).trim()).filter(Boolean);
    if (isEmpty(v)) continue;
    if (typeof v === 'string' && (prop.type === 'integer' || prop.type === 'number')) v = coerce(prop, v);
    if (Number.isNaN(v)) continue;
    payload[key] = v;
  }
  // multi_prompt solo tiene sentido con multi_shots activado.
  if (payload.multi_shots === false) delete payload.multi_prompt;
  return payload;
}

function matches(cond, payload) {
  if (!cond) return true;
  for (const key of cond.required || []) if (isEmpty(payload[key])) return false;
  for (const [key, sub] of Object.entries(cond.properties || {})) {
    // Semántica JSON Schema: una propiedad ausente no invalida `properties`.
    if ('const' in sub && payload[key] !== undefined && payload[key] !== sub.const) return false;
  }
  return true;
}

function checkRules(rules, payload, errors, depth = 0) {
  if (!rules || depth > 4) return;
  for (const key of rules.required || []) {
    if (isEmpty(payload[key])) errors.push({ key, message: `Falta «${humanize(key)}».` });
  }
  for (const [key, sub] of Object.entries(rules.properties || {})) {
    const v = payload[key];
    if (v === undefined) continue;
    if ('const' in sub && v !== sub.const) {
      errors.push({ key, message: `«${humanize(key)}» debe ser ${enumLabel(sub.const)} con esta configuración.` });
    }
    if (Array.isArray(v) && sub.maxItems !== undefined && v.length > sub.maxItems) {
      errors.push({ key, message: `«${humanize(key)}» admite como máximo ${sub.maxItems} en este modo.` });
    }
    if (Array.isArray(v) && sub.minItems !== undefined && v.length < sub.minItems) {
      errors.push({ key, message: `«${humanize(key)}» necesita al menos ${sub.minItems} en este modo.` });
    }
  }
  for (const sub of rules.allOf || []) checkRules(sub, payload, errors, depth + 1);
  if (rules.if) {
    if (matches(rules.if, payload)) checkRules(rules.then, payload, errors, depth + 1);
    else checkRules(rules.else, payload, errors, depth + 1);
  }
}

// Valida lo mínimo necesario para evitar un 422 evitable. Devuelve [] si está bien.
export function validatePayload(schema, payload) {
  const errors = [];
  for (const [key, raw] of Object.entries(schema?.properties || {})) {
    const prop = unwrap(raw);
    const v = payload[key];
    if (v === undefined) continue;
    const label = humanize(key);
    if (prop.enum && !prop.enum.includes(v)) errors.push({ key, message: `«${label}» tiene un valor no válido.` });
    if (typeof v === 'number') {
      if (prop.minimum !== undefined && v < prop.minimum) errors.push({ key, message: `«${label}» debe ser ≥ ${prop.minimum}.` });
      if (prop.maximum !== undefined && v > prop.maximum) errors.push({ key, message: `«${label}» debe ser ≤ ${prop.maximum}.` });
    }
    if (typeof v === 'string') {
      if (prop.maxLength !== undefined && v.length > prop.maxLength) errors.push({ key, message: `«${label}» supera ${prop.maxLength} caracteres.` });
      if (prop.format === 'uri' && !/^https?:\/\//.test(v)) errors.push({ key, message: `«${label}» debe ser una URL pública (https://…).` });
    }
    if (Array.isArray(v)) {
      if (prop.maxItems !== undefined && v.length > prop.maxItems) errors.push({ key, message: `«${label}» admite como máximo ${prop.maxItems}.` });
      if (prop.minItems !== undefined && v.length < prop.minItems) errors.push({ key, message: `«${label}» necesita al menos ${prop.minItems}.` });
    }
  }
  checkRules({ required: schema?.required, allOf: schema?.allOf, if: schema?.if, then: schema?.then, else: schema?.else }, payload, errors);
  // Regla documentada de los modelos Kling con varias tomas.
  if (payload.multi_shots === true && schema?.properties?.multi_prompt && isEmpty(payload.multi_prompt)) {
    errors.push({ key: 'multi_prompt', message: 'Añade al menos una toma con su prompt.' });
  }
  const unique = new Map();
  for (const e of errors) unique.set(e.message, e);
  return [...unique.values()];
}

// Extrae las URLs de salida de una respuesta de estado completada.
export function extractOutputs(result) {
  if (!result) return [];
  const out = [];
  for (const img of result.images || []) if (img?.url) out.push({ type: 'image', url: img.url });
  if (result.video?.url) out.push({ type: 'video', url: result.video.url });
  if (result.audio?.url) out.push({ type: 'audio', url: result.audio.url });
  else for (const a of result.audios || []) if (a?.url) out.push({ type: 'audio', url: a.url });
  return out;
}

export const TERMINAL = new Set(['completed', 'failed', 'nsfw', 'canceled']);

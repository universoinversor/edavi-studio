import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildPayload, defaultValues, describeFields, validatePayload, extractOutputs, classifyField,
} from '../lib/schema.js';

const catalog = JSON.parse(readFileSync(new URL('../lib/catalog.json', import.meta.url)));
const byEndpoint = (e) => catalog.models.find((m) => m.endpoint === e);

test('el catálogo tiene modelos de imagen, video y transformación con schema', () => {
  assert.ok(catalog.models.length >= 60);
  for (const studio of ['image', 'video', 'transform']) {
    assert.ok(catalog.models.some((m) => m.studio === studio), studio);
  }
  for (const m of catalog.models) {
    assert.ok(m.endpoint && !m.endpoint.startsWith('/'), m.id);
    assert.equal(typeof m.schema.properties, 'object', m.id);
  }
});

test('todos los campos de todos los modelos tienen un control conocido', () => {
  for (const m of catalog.models) {
    for (const f of describeFields(m.schema).all) {
      assert.notEqual(f.kind, 'json', `${m.endpoint} → ${f.key} no tiene control`);
    }
  }
});

test('classifyField reconoce medios, listas y selectores especiales', () => {
  assert.equal(classifyField('image_url', { type: 'string', format: 'uri' }).kind, 'media');
  assert.equal(classifyField('video_urls', { type: 'array', items: { type: 'string' } }).accept, 'video');
  assert.equal(classifyField('seed', { anyOf: [{ type: 'integer', minimum: 1, maximum: 10 }, { type: 'null' }] }).kind, 'seed');
  assert.equal(classifyField('cfg_scale', { type: 'number', minimum: 0, maximum: 1 }).kind, 'range');
  assert.equal(classifyField('style_id', { type: 'string', format: 'uuid' }).kind, 'style');
});

test('buildPayload descarta vacíos, recorta texto y convierte números', () => {
  const m = byEndpoint('bytedance/seedance-2.5/image-to-video');
  const payload = buildPayload(m.schema, {
    ...defaultValues(m.schema), prompt: '  un zorro en la nieve ', image_url: 'https://x.test/a.jpg',
    end_image_url: '', duration: '8', unknown: 'fuera',
  });
  assert.deepEqual(payload, {
    prompt: 'un zorro en la nieve', duration: 8, image_url: 'https://x.test/a.jpg',
    resolution: '720p', bitrate_mode: 'high', generate_audio: true,
  });
  assert.deepEqual(validatePayload(m.schema, payload), []);
});

test('falta la imagen obligatoria en imagen a video', () => {
  const m = byEndpoint('bytedance/seedance-2.5/image-to-video');
  const errors = validatePayload(m.schema, buildPayload(m.schema, { prompt: 'hola' }));
  assert.equal(errors[0].key, 'image_url');
});

test('rangos y enums fuera de límites se detectan', () => {
  const m = byEndpoint('bytedance/seedance-2.5/image-to-video');
  const errors = validatePayload(m.schema, { image_url: 'https://x.test/a.jpg', duration: 99, resolution: '8k' });
  assert.deepEqual(errors.map((e) => e.key).sort(), ['duration', 'resolution']);
});

test('referencias: Seedance exige al menos un tipo de referencia (if/else anidado)', () => {
  const m = byEndpoint('bytedance/seedance-2.5/reference-to-video');
  assert.equal(validatePayload(m.schema, { prompt: 'x' }).at(-1).key, 'audio_urls');
  assert.deepEqual(validatePayload(m.schema, { prompt: 'x', video_urls: ['https://x.test/v.mp4'] }), []);
});

test('Kling O3: varias tomas exige multi_prompt; una toma exige prompt', () => {
  const m = byEndpoint('kling-video/o3/image-reference');
  const single = buildPayload(m.schema, { ...defaultValues(m.schema) });
  assert.ok(validatePayload(m.schema, single).some((e) => e.key === 'prompt'));
  const multi = buildPayload(m.schema, {
    ...defaultValues(m.schema), prompt: 'general', multi_shots: true,
    multi_prompt: [{ prompt: 'plano 1', duration: '3' }, { prompt: '  ', duration: 2 }],
  });
  assert.deepEqual(multi.multi_prompt, [{ prompt: 'plano 1', duration: 3 }]);
  assert.deepEqual(validatePayload(m.schema, multi), []);
});

test('Marketing Studio con mejora exige preset, imágenes y calidad alta', () => {
  const m = byEndpoint('marketing-studio/image');
  const errors = validatePayload(m.schema, { prompt: 'anuncio', enhance_prompt: true, quality: 'low' });
  const keys = errors.map((e) => e.key);
  assert.ok(keys.includes('preset_id'));
  assert.ok(keys.includes('image_urls'));
  assert.ok(keys.includes('quality'));
});

test('extractOutputs normaliza imágenes, video y audio', () => {
  assert.deepEqual(extractOutputs({ images: [{ url: 'a' }, { url: 'b' }] }).map((o) => o.url), ['a', 'b']);
  assert.deepEqual(extractOutputs({ video: { url: 'v' } }), [{ type: 'video', url: 'v' }]);
  assert.deepEqual(extractOutputs({ audio: { url: 'x' }, audios: [{ url: 'x' }] }), [{ type: 'audio', url: 'x' }]);
});

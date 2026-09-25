import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { animateTargets, carryValues, chainedPayload, compareCandidates, variationPayloads } from '../lib/plan.js';
import { buildPayload as buildPayloadFor, validatePayload } from '../lib/schema.js';

const { models } = JSON.parse(readFileSync(new URL('../lib/catalog.json', import.meta.url), 'utf8'));
const get = (id) => models.find((m) => m.id === id);

test('variaciones: semillas distintas cuando el modelo tiene semilla y no se fijó', () => {
  const m = get('soul-2/generate');
  const out = variationPayloads(m, { prompt: 'x' }, 4);
  assert.equal(out.length, 4);
  assert.equal(new Set(out.map((p) => p.seed)).size, 4);
  for (const p of out) assert.deepEqual(validatePayload(m.schema, p), []);
});

test('variaciones: respeta la semilla fijada y los modelos sin semilla', () => {
  const soul = get('soul-2/generate');
  assert.ok(variationPayloads(soul, { prompt: 'x', seed: 7 }, 3).every((p) => p.seed === 7));
  const kling = get('kling-3/pro-text-to-video');
  assert.ok(variationPayloads(kling, { prompt: 'x' }, 2).every((p) => p.seed === undefined));
  assert.equal(variationPayloads(kling, { prompt: 'x' }, 99).length, 4);
});

test('carryValues descarta valores que el nuevo modelo no admite', () => {
  const m = get('seedance-2-5/text-to-video');
  const v = carryValues(m, { prompt: 'hola', aspect_ratio: '99:1', style_id: 'x', duration: 8 });
  assert.equal(v.prompt, 'hola');
  assert.equal(v.duration, 8);
  assert.notEqual(v.aspect_ratio, '99:1');
  assert.equal(v.style_id, undefined);
});

test('comparar: solo propone modelos válidos de otras familias del mismo estudio', () => {
  const current = get('seedance-2-5/text-to-video');
  const list = compareCandidates(models, current, { prompt: 'un zorro en la nieve' });
  assert.ok(list.length >= 5);
  for (const { model, payload } of list) {
    assert.equal(model.studio, 'video');
    assert.notEqual(model.familyId, current.familyId);
    assert.deepEqual(validatePayload(model.schema, payload), []);
  }
  assert.equal(new Set(list.map((c) => c.model.familyId)).size, list.length);
});

test('flujo imagen → video: destinos válidos y payload encadenado correcto', () => {
  const targets = animateTargets(models);
  assert.ok(targets.some((m) => m.id === 'seedance-2-5/image-to-video'));
  const m = get('seedance-2-5/image-to-video');
  const p = chainedPayload(m, { prompt: 'gira lentamente' }, 'https://cdn.test/a.png');
  assert.equal(p.image_url, 'https://cdn.test/a.png');
  assert.deepEqual(validatePayload(m.schema, p), []);
});

import { applyPromptEntry } from '../lib/plan.js';
import { VIDEO_PROMPTS, TRANSFORM_PROMPTS } from '../lib/prompt-bank.js';

test('biblioteca: aplica parámetros válidos e ignora los que el modelo no admite', () => {
  const cinema = get('cinema-studio-4/generate');
  const entry = VIDEO_PROMPTS.find((p) => p.title === 'Neo-noir bajo la lluvia');
  const v = applyPromptEntry(cinema, {}, entry);
  assert.equal(v.genre, 'noir');
  assert.equal(v.camera_movement, 'dolly-in');
  const seedance = get('seedance-2-5/text-to-video');
  const s = applyPromptEntry(seedance, {}, entry);
  assert.equal(s.genre, undefined);
  assert.equal(s.prompt, entry.prompt);
});

test('biblioteca: storyboard → varias tomas en Kling, texto combinado en otros', () => {
  const entry = VIDEO_PROMPTS.find((p) => p.shots);
  const kling = get('kling-3/pro-text-to-video');
  const k = applyPromptEntry(kling, {}, entry);
  assert.equal(k.multi_shots, true);
  assert.equal(k.multi_prompt.length, entry.shots.length);
  assert.deepEqual(validatePayload(kling.schema, buildPayloadFor(kling, k)), []);
  const wan = get('wan-3/text-to-video');
  assert.match(applyPromptEntry(wan, {}, entry).prompt, /Shot 1:/);
});

test('biblioteca: todos los parámetros de los prompts de video existen en algún modelo', () => {
  for (const entry of VIDEO_PROMPTS) {
    for (const [key, value] of Object.entries(entry.params || {})) {
      const ok = models.some((m) => {
        const p = m.schema.properties[key];
        return p && (!p.enum || p.enum.includes(value));
      });
      assert.ok(ok, `${entry.title}: ${key}=${value}`);
    }
    for (const fam of entry.best || []) assert.ok(models.some((m) => m.familyId === fam), `${entry.title}: familia ${fam}`);
  }
  assert.ok(VIDEO_PROMPTS.length >= 50 && TRANSFORM_PROMPTS.length >= 20);
});

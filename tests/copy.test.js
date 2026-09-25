import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COPY } from '../lib/copy.js';

// Un literal con la misma clave dos veces no falla: la última gana en silencio
// (así se rompió una vez la pestaña «Cómo funciona»). Esta prueba lo detecta.
test('copy: sin claves duplicadas dentro del mismo objeto', () => {
  const lines = readFileSync(new URL('../lib/copy.js', import.meta.url), 'utf8').split('\n');
  const stack = [{ indent: -1, keys: new Set() }];
  const dupes = [];
  lines.forEach((line, i) => {
    // Un «{» suelto es un objeto nuevo dentro de un array: ámbito propio.
    const element = line.match(/^(\s*)\{\s*$/);
    if (element) {
      const indent = element[1].length;
      while (stack.length > 1 && stack.at(-1).indent > indent) stack.pop();
      stack.push({ indent: indent + 1, keys: new Set() });
      return;
    }
    const m = line.match(/^(\s*)([A-Za-z_$][\w$]*)\s*:/);
    if (!m) return;
    const indent = m[1].length;
    while (stack.length > 1 && stack.at(-1).indent > indent) stack.pop();
    if (stack.at(-1).indent < indent) stack.push({ indent, keys: new Set() });
    const scope = stack.at(-1);
    if (scope.keys.has(m[2])) dupes.push(`${m[2]} (línea ${i + 1})`);
    scope.keys.add(m[2]);
    // Una clave que abre un objeto inicia un nuevo ámbito para sus hijos.
    if (/[{[]\s*$/.test(line)) stack.push({ indent: indent + 1, keys: new Set() });
  });
  assert.deepEqual(dupes, []);
});

test('copy: todos los textos son cadenas, funciones o colecciones de ellos', () => {
  const bad = [];
  const walk = (v, path) => {
    if (typeof v === 'string' || typeof v === 'function') return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`); return; }
    bad.push(path);
  };
  walk(COPY, 'COPY');
  assert.deepEqual(bad, []);
});

test('copy: las etiquetas de pestañas y estados son texto', () => {
  for (const key of ['history', 'how', 'filters', 'thisStudio', 'all']) assert.equal(typeof COPY.gallery[key], 'string', key);
  for (const s of ['explore', 'image', 'video', 'transform', 'characters', 'prompts', 'library']) {
    assert.equal(typeof COPY.studios[s].label, 'string', s);
  }
  assert.equal(typeof COPY.status.completed, 'string');
});

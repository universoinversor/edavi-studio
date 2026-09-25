#!/usr/bin/env node
// Regenera lib/catalog.json con la documentación oficial de Higgsfield.
// Ejecuta `npm run sync:catalog` cuando Higgsfield publique modelos nuevos:
// la interfaz se construye sola a partir de los schemas que se guardan aquí.
//
// Fuentes (desde 2026-09 Higgsfield documenta cada modelo por separado):
//   · open.higgsfield.ai/explore*           → lista pública de modelos
//   · dash.higgsfield.ai/models/<id>/llms.txt → endpoint, descripción y JSON Schema
// Los modelos que ya están en el catálogo se conservan aunque no salgan en Explorar,
// y nunca se escribe un catálogo más pequeño si algo falla.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXPLORE = ['explore', 'explore/image', 'explore/video'].map((p) => `https://open.higgsfield.ai/${p}`);
const MODEL_DOC = (endpoint) => `https://dash.higgsfield.ai/models/${endpoint}/llms.txt`;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalog.json');
// Endpoints renombrados por Higgsfield: el antiguo deja de existir.
const RENAMED = { higgsfiled: 'higgsfield' };

async function text(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} al descargar ${url}`);
  return res.text();
}

const fixEndpoint = (e) => e.replace(/^([^/]+)/, (first) => RENAMED[first] || first);

async function exploreEndpoints() {
  const found = new Set();
  for (const url of EXPLORE) {
    const html = await text(url).catch(() => '');
    for (const [, e] of html.matchAll(/models\/([a-z0-9][a-z0-9./_-]*?)\/playground/g)) {
      if (!e.startsWith('workflows/')) found.add(e); // los "workflows" son presets de otros modelos
    }
  }
  return found;
}

function parseModelDoc(md) {
  const endpoint = (md.match(/\*\*Model ID\*\*: `([^`]+)`/) || [])[1];
  const title = (md.match(/^# (.+)$/m) || [])[1]?.trim();
  const description = (md.match(/^> (.+)$/m) || [])[1]?.trim() || '';
  const schemaBlock = (md.split('### Input JSON Schema')[1] || '').match(/```json\n([\s\S]*?)```/);
  let schema = null;
  try { schema = schemaBlock ? JSON.parse(schemaBlock[1]) : null; } catch { schema = null; }
  const outputSchema = (md.split('### Output Schema')[1] || '').split('\n## ')[0];
  const output = /"video"/.test(outputSchema) ? 'video' : /"images"/.test(outputSchema) ? 'image' : /"audio"/.test(outputSchema) ? 'audio' : null;
  return { endpoint, title, description, schema, output };
}

function studioFor(entry) {
  const w = `${entry.id} ${entry.workflow}`.toLowerCase();
  if (entry.output === 'image') return 'image';
  if (/genjutsu|motion-control|motion-transfer|object-swap|video-edit|video-extend|video-reference/.test(w)) return 'transform';
  return 'video';
}

function newEntry(doc) {
  const parts = doc.endpoint.split('/');
  const familyId = parts.slice(0, 2).join('-').replace(/[^a-z0-9-]/g, '-');
  const workflow = parts.slice(2).join(' ').replace(/[-_]/g, ' ') || 'Generate';
  const entry = {
    id: `${familyId}/${parts.slice(2).join('-') || 'generate'}`,
    familyId,
    family: doc.title || parts[1],
    familyDescription: doc.description,
    workflow: workflow.charAt(0).toUpperCase() + workflow.slice(1),
    endpoint: doc.endpoint,
    output: doc.output,
    notes: [],
    schema: doc.schema,
    docs: `https://console.higgsfield.ai/models/${doc.endpoint}`,
  };
  entry.studio = studioFor(entry);
  return entry;
}

async function main() {
  const previous = JSON.parse(await readFile(OUT, 'utf8'));
  const known = new Map(previous.models.map((m) => [fixEndpoint(m.endpoint), m]));
  const endpoints = new Set([...known.keys(), ...(await exploreEndpoints())]);

  const models = [];
  const kept = [];
  const added = [];
  const list = [...endpoints];
  for (let i = 0; i < list.length; i += 8) {
    const batch = list.slice(i, i + 8);
    const docs = await Promise.all(batch.map((e) => text(MODEL_DOC(e)).then(parseModelDoc).catch(() => null)));
    batch.forEach((endpoint, j) => {
      const doc = docs[j];
      const old = known.get(endpoint);
      if (!doc?.schema || !doc.output) {
        if (old) { models.push({ ...old, endpoint }); kept.push(endpoint); }
        return;
      }
      if (old) {
        const notes = (old.notes || []).filter((n) => !/higgsfiled/.test(n));
        models.push({ ...old, endpoint: doc.endpoint, output: doc.output, schema: doc.schema, notes });
      } else {
        models.push(newEntry(doc));
        added.push(doc.endpoint);
      }
    });
  }

  if (models.length < previous.models.length) {
    throw new Error(`El catálogo nuevo tiene menos modelos (${models.length}) que el actual (${previous.models.length}); no se escribe.`);
  }
  models.sort((a, b) => a.family.localeCompare(b.family) || a.workflow.localeCompare(b.workflow));
  const catalog = { source: 'https://dash.higgsfield.ai/models/<endpoint>/llms.txt', syncedAt: new Date().toISOString(), models };
  await writeFile(OUT, JSON.stringify(catalog, null, 1) + '\n');
  console.log(`Catálogo actualizado: ${models.length} endpoints → ${path.relative(process.cwd(), OUT)}`);
  if (added.length) console.log(`Nuevos: ${added.join(', ')}`);
  if (kept.length) console.log(`Sin documentación nueva (se conserva el schema anterior): ${kept.join(', ')}`);
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });

#!/usr/bin/env node
// Regenera lib/catalog.json leyendo la documentación oficial de Higgsfield.
// Ejecuta `npm run sync:catalog` cuando Higgsfield publique modelos nuevos:
// la interfaz se construye sola a partir de los schemas que se guardan aquí.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DOCS = 'https://docs.higgsfield.ai/docs';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalog.json');

async function text(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} al descargar ${url}`);
  return res.text();
}

function parseWorkflowPage(slug, md) {
  const title = (md.match(/^# (.+?) API\s*$/m) || [])[1] || slug;
  const [family, workflow = ''] = title.split(' — ');
  const endpoint = (md.match(/\*\*Endpoint ID:\*\* `([^`]+)`/) || [])[1];
  const schemaMatch = md.match(/Complete JSON schema">\s*```json[^\n]*\n([\s\S]*?)```/);
  let schema = null;
  try { schema = schemaMatch ? JSON.parse(schemaMatch[1]) : null; } catch { schema = null; }
  const completed = md.split('A completed response')[1] || '';
  const output = /"video"/.test(completed) ? 'video' : /"images"/.test(completed) ? 'image' : /"audio"/.test(completed) ? 'audio' : null;
  const notes = ((md.split('## Usage notes')[1] || '').split('\n## ')[0].match(/^\* .+$/gm) || [])
    .map((line) => line.slice(2).replace(/\\([_{}*])/g, '$1'))
    .filter((line) => !/example\.com|placeholder/i.test(line));
  return { family: family.trim(), workflow: workflow.trim(), endpoint, output, notes, schema };
}

function studioFor(entry) {
  const w = `${entry.slug} ${entry.workflow}`.toLowerCase();
  if (entry.output === 'image') return 'image';
  if (/genjutsu|motion-control|video-edit|video-extend|video-reference/.test(w)) return 'transform';
  return 'video';
}

async function main() {
  const index = await text(`${DOCS}/llms.txt`);
  const familyInfo = {};
  for (const [, name, slug, desc] of index.matchAll(/^- \[(.+?) API\]\(https:\/\/docs\.higgsfield\.ai\/docs\/models\/([a-z0-9-]+)\.md\): (.+)$/gm)) {
    familyInfo[slug] = { name, description: desc.trim() };
  }
  const pages = [...index.matchAll(/https:\/\/docs\.higgsfield\.ai\/docs\/models\/([a-z0-9-]+)\/([a-z0-9-]+)\.md/g)]
    .map(([url, familySlug, workflowSlug]) => ({ url, familySlug, workflowSlug }));

  const models = [];
  const skipped = [];
  // Descarga en lotes pequeños para no saturar el servidor de documentación.
  for (let i = 0; i < pages.length; i += 8) {
    const batch = pages.slice(i, i + 8);
    const results = await Promise.all(batch.map(async (p) => ({ p, md: await text(p.url) })));
    for (const { p, md } of results) {
      const parsed = parseWorkflowPage(p.workflowSlug, md);
      const slug = `${p.familySlug}/${p.workflowSlug}`;
      if (!parsed.endpoint || !parsed.schema || !parsed.output) { skipped.push(slug); continue; }
      const entry = {
        id: slug,
        familyId: p.familySlug,
        family: familyInfo[p.familySlug]?.name || parsed.family,
        familyDescription: familyInfo[p.familySlug]?.description || '',
        workflow: parsed.workflow,
        endpoint: parsed.endpoint,
        output: parsed.output,
        notes: parsed.notes,
        schema: parsed.schema,
        docs: p.url.replace(/\.md$/, ''),
      };
      entry.slug = slug;
      entry.studio = studioFor(entry);
      delete entry.slug;
      models.push(entry);
    }
  }

  models.sort((a, b) => a.family.localeCompare(b.family) || a.workflow.localeCompare(b.workflow));
  const catalog = { source: `${DOCS}/llms.txt`, syncedAt: new Date().toISOString(), models };
  await writeFile(OUT, JSON.stringify(catalog, null, 1) + '\n');
  console.log(`Catálogo actualizado: ${models.length} endpoints → ${path.relative(process.cwd(), OUT)}`);
  if (skipped.length) console.log(`Omitidos (no son de generación o sin schema): ${skipped.join(', ')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });

#!/usr/bin/env node
// Importa el banco de prompts de imagen de MeiGen (MIT, © 2026 MeiGen)
// https://github.com/jau123/MeiGen-AI-Design-MCP → public/prompts/meigen.json
// Cada prompt conserva su autor y el enlace a la publicación original.
// Uso: npm run import:prompts
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SOURCE = 'https://raw.githubusercontent.com/jau123/MeiGen-AI-Design-MCP/HEAD/data/trending-prompts.json';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'prompts', 'meigen.json');

const CATEGORY_ES = {
  Photography: 'Fotografía',
  'Illustration & 3D': 'Ilustración y 3D',
  'Product & Brand': 'Producto y marca',
  'Food & Drink': 'Comida y bebida',
  'Poster Design': 'Pósters',
  'UI & Graphic': 'UI y gráfico',
  '3D': 'Ilustración y 3D',
  Food: 'Comida y bebida',
  Photograph: 'Fotografía',
  Product: 'Producto y marca',
  Poster: 'Pósters',
  Design: 'UI y gráfico',
};

// Título corto a partir del propio prompt (primera frase útil).
const GENERIC = /^(create|generate|make|produce|design|render|output)\b[^.]{0,30}\b(image|picture|photo|output|render)s?\b\.?$/i;

function titleOf(prompt) {
  const sentences = prompt
    .replace(/[{}"[\]#*_]/g, ' ')
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, ' ').replace(/^[\s:,\-–—]+/, '').trim())
    .filter((s) => s.length >= 18 && !GENERIC.test(s) && !/^[A-Z _]+:?\.?$/.test(s) && !/^\w+\s*:\s*$/.test(s)
      // Fuera las líneas que solo definen variables de plantilla («BRAND NAME : …», «A | B | C»).
      && !/\s\|\s/.test(s) && !/^[A-Z][A-Z ]{2,}\s*:/.test(s) && !/^[a-z_ ]{2,20}\s*:/.test(s));
  const first = sentences[0] || prompt.replace(/\s+/g, ' ').trim();
  return first.length > 72 ? `${first.slice(0, 69).trim()}…` : first;
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`No se pudo descargar el banco (${res.status})`);
const raw = await res.json();

const prompts = raw
  .filter((p) => p.prompt && p.prompt.trim().length > 20)
  .map((p) => ({
    id: String(p.id),
    title: titleOf(p.prompt),
    prompt: p.prompt.trim(),
    categories: [...new Set((p.categories || []).map((c) => CATEGORY_ES[c] || c))],
    model: p.model,
    author: p.author_name || p.author,
    handle: p.author,
    likes: p.likes || 0,
    template: /\[[^\]]{2,40}\]/.test(p.prompt),
    lang: /[぀-ヿ一-鿿]/.test(p.prompt) ? 'zh' : 'en',
    source: p.source_url,
  }))
  .sort((a, b) => b.likes - a.likes);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  source: 'MeiGen AI Design MCP (MIT) — https://github.com/jau123/MeiGen-AI-Design-MCP',
  importedAt: new Date().toISOString(),
  prompts,
}));
console.log(`Importados ${prompts.length} prompts de imagen → ${path.relative(process.cwd(), OUT)}`);

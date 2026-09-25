'use client';
import { useEffect, useMemo, useState } from 'react';
import { TRANSFORM_PROMPTS, VIDEO_CATEGORIES, VIDEO_PROMPTS } from '@/lib/prompt-bank';

const PAGE = 60;
const KINDS = [
  { id: 'image', label: 'Imagen' },
  { id: 'video', label: 'Video' },
  { id: 'transform', label: 'Transformar' },
];

let meigenCache = null;
function loadMeigen() {
  if (!meigenCache) {
    meigenCache = fetch('/prompts/meigen.json')
      .then((r) => (r.ok ? r.json() : { prompts: [] }))
      .then((d) => d.prompts.map((p) => ({ ...p, kind: 'image', key: `m${p.id}`, category: p.categories[0] || 'Otros' })))
      .catch(() => { meigenCache = null; return []; });
  }
  return meigenCache;
}

const VIDEO = VIDEO_PROMPTS.map((p, i) => ({ ...p, kind: 'video', key: `v${i}` }));
const TRANSFORM = TRANSFORM_PROMPTS.map((p, i) => ({ ...p, kind: 'transform', key: `t${i}` }));

function highlight(text) {
  // Resalta los [HUECOS] de las plantillas.
  return text.split(/(\[[^\]]{1,40}\])/g).map((part, i) => (/^\[.*\]$/.test(part) ? <mark key={i}>{part}</mark> : part));
}

function PromptCard({ entry, familyId, onUse, useLabel }) {
  const [open, setOpen] = useState(false);
  const recommended = familyId && entry.best?.includes(familyId);
  return (
    <article className={`pcard ${open ? 'open' : ''}`}>
      <header className="pcard-top">
        <span className="ptag">{entry.category}</span>
        {entry.shots && <span className="ptag ptag-accent">{entry.shots.length} tomas</span>}
        {entry.template && <span className="ptag ptag-accent">Plantilla</span>}
        {recommended && <span className="ptag ptag-ok">Ideal para este modelo</span>}
      </header>
      <h3>{entry.title}</h3>
      <p className="pcard-text" onClick={() => setOpen((o) => !o)} title={open ? 'Contraer' : 'Ver completo'}>
        {highlight(entry.shots ? `${entry.prompt} ${entry.shots.map((s, i) => `(${i + 1}) ${s.prompt}`).join(' ')}` : entry.prompt)}
      </p>
      {entry.params && (
        <p className="pcard-params mono">{Object.entries(entry.params).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')}</p>
      )}
      <footer className="pcard-foot">
        {entry.author ? (
          <span className="pcard-meta">
            {entry.likes ? <span>♥ {entry.likes >= 1000 ? `${(entry.likes / 1000).toFixed(1)}k` : entry.likes}</span> : null}
            <span>@{entry.handle || entry.author}</span>
            {entry.source && <a href={entry.source} target="_blank" rel="noreferrer">Ver ejemplo ↗</a>}
          </span>
        ) : <span className="pcard-meta"><span>EDAVI</span></span>}
        <button type="button" className="pill-btn pcard-use" onClick={() => onUse(entry)}>{useLabel}</button>
      </footer>
    </article>
  );
}

// Biblioteca de prompts. En modo «sheet» vive dentro del compositor (un solo tipo);
// en modo «page» es una sección completa con pestañas Imagen / Video / Transformar.
export default function PromptLibrary({ kind: fixedKind, familyId, familyName, onUse, onClose, page = false }) {
  const [kind, setKind] = useState(fixedKind || 'image');
  const [meigen, setMeigen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [onlyTemplates, setOnlyTemplates] = useState(false);
  const [onlyBest, setOnlyBest] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    if (kind !== 'image' || meigen.length) return;
    setLoading(true);
    loadMeigen().then((list) => { setMeigen(list); setLoading(false); });
  }, [kind, meigen.length]);

  useEffect(() => { setLimit(PAGE); }, [kind, query, category, onlyTemplates, onlyBest]);
  useEffect(() => { setCategory('all'); setOnlyBest(false); }, [kind]);

  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const source = kind === 'image' ? meigen : kind === 'video' ? VIDEO : TRANSFORM;
  const categories = useMemo(() => {
    if (kind === 'video') return VIDEO_CATEGORIES;
    const counts = new Map();
    for (const p of source) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    return [...counts.keys()];
  }, [kind, source]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((p) => (category === 'all' || p.category === category || p.categories?.includes(category))
      && (!onlyTemplates || p.template)
      && (!onlyBest || p.best?.includes(familyId))
      && (!q || `${p.title} ${p.prompt} ${p.author || ''}`.toLowerCase().includes(q)));
  }, [source, query, category, onlyTemplates, onlyBest, familyId]);

  function surprise() {
    if (filtered.length) onUse(filtered[Math.floor(Math.random() * filtered.length)], kind);
  }

  const body = (
    <div className={`plib ${page ? 'plib-page' : ''}`} role={page ? undefined : 'dialog'} aria-label="Biblioteca de prompts" onClick={(e) => e.stopPropagation()}>
      <header className="plib-head">
        <div>
          <h2>{page ? 'Biblioteca de prompts' : 'Inspiración'}</h2>
          <p className="dim">
            {kind === 'image'
              ? `${meigen.length || '1.446'} prompts de imagen de la comunidad MeiGen`
              : `${source.length} prompts originales de EDAVI${familyName ? ` · ${familyName}` : ''}`}
          </p>
        </div>
        <div className="plib-actions">
          <button type="button" className="pill-btn" onClick={surprise} disabled={!filtered.length}>🎲 Sorpréndeme</button>
          {onClose && <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>}
        </div>
      </header>

      {!fixedKind && (
        <nav className="panel-tabs plib-kinds" role="tablist">
          {KINDS.map((k) => (
            <button type="button" role="tab" key={k.id} aria-selected={kind === k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </nav>
      )}

      <div className="plib-filters">
        <input type="search" placeholder="Buscar: retrato, producto, neón, anime…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar prompts" />
        <div className="chips">
          <button type="button" className={`chip ${category === 'all' ? 'on' : ''}`} onClick={() => setCategory('all')}>Todos</button>
          {categories.map((c) => (
            <button type="button" key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
          {kind === 'image' && (
            <button type="button" className={`chip ${onlyTemplates ? 'on' : ''}`} onClick={() => setOnlyTemplates((v) => !v)}>Solo plantillas</button>
          )}
          {kind === 'video' && familyId && (
            <button type="button" className={`chip ${onlyBest ? 'on' : ''}`} onClick={() => setOnlyBest((v) => !v)}>Ideales para {familyName}</button>
          )}
        </div>
      </div>

      <div className="plib-grid">
        {loading && <p className="dim">Cargando prompts…</p>}
        {!loading && filtered.length === 0 && <p className="dim">Nada coincide con tu búsqueda.</p>}
        {filtered.slice(0, limit).map((entry) => (
          <PromptCard key={entry.key} entry={entry} familyId={familyId} useLabel={page ? `Usar en ${KINDS.find((k) => k.id === kind).label}` : 'Usar'}
            onUse={(e) => onUse(e, kind)} />
        ))}
      </div>
      {filtered.length > limit && (
        <div className="plib-more">
          <button type="button" className="pill-btn" onClick={() => setLimit((l) => l + PAGE)}>Ver más ({filtered.length - limit} restantes)</button>
        </div>
      )}
      {kind === 'image' && (
        <p className="plib-credit dim">
          Prompts de imagen de <a href="https://github.com/jau123/MeiGen-AI-Design-MCP" target="_blank" rel="noreferrer">MeiGen</a> (MIT), creados por sus autores; cada tarjeta enlaza a la publicación original.
        </p>
      )}
    </div>
  );

  if (page) return body;
  return <div className="sheet-backdrop" onClick={onClose}>{body}</div>;
}

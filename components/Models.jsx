'use client';
import { useMemo, useState } from 'react';
import { familiesForStudio, FEATURED, workflowLabel } from '@/lib/catalog';
import { COPY } from '@/lib/copy';
import Avatar from './Avatar';
import Icon from './Icon';

const t = COPY.models;
const KINDS = COPY.explore.kinds;
const FILTERS = COPY.explore.filters;
const STUDIOS = ['image', 'video', 'transform'];

// Color de portada estable por familia (sin imágenes externas).
function hue(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function FamilyCard({ family, studio, badge, onOpen }) {
  const h = hue(family.id);
  return (
    <article className="mcard" style={/** @type {any} */ ({ '--h': h })}>
      <button type="button" className="mcard-cover" onClick={() => onOpen(studio, family.models[0].id)}
        aria-label={t.openMode(family.name, workflowLabel(family.models[0].workflow))}>
        <span className="mcard-art" aria-hidden>
          <span className="mcard-word">{family.name}</span>
        </span>
        <span className="mcard-chips" aria-hidden>
          <span className="mcard-kind"><Icon name={studio === 'image' ? 'camera' : 'video'} size={13} /> {KINDS[studio]}</span>
          {badge && <em className={`tag tag-${badge.toLowerCase()}`}>{badge}</em>}
        </span>
      </button>
      <div className="mcard-body">
        <h3 className="mcard-name">{family.name}</h3>
        <p className="mcard-desc">{family.description}</p>
        <ul className="mcard-modes" aria-label={t.modes(family.models.length)}>
          {family.models.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onOpen(studio, m.id)} aria-label={t.openMode(family.name, workflowLabel(m.workflow))}>
                {workflowLabel(m.workflow)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Models({ onOpen }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');

  const all = useMemo(() => STUDIOS.flatMap((studio) => familiesForStudio(studio).map((family) => ({
    studio, family, badge: FEATURED.find((f) => f.family === family.id && f.studio === studio)?.badge || null,
    rank: FEATURED.findIndex((f) => f.family === family.id && f.studio === studio),
    haystack: [family.name, family.description, ...family.models.flatMap((m) => [m.workflow, workflowLabel(m.workflow), m.endpoint])].join(' ').toLowerCase(),
  }))), []);
  const totalModels = all.reduce((n, x) => n + x.family.models.length, 0);

  const q = query.trim().toLowerCase();
  const list = all
    .filter((x) => (filter === 'all' || x.studio === filter) && (!q || x.haystack.includes(q)))
    .sort((a, b) => {
      if (sort === 'az') return a.family.name.localeCompare(b.family.name);
      if (sort === 'modes') return b.family.models.length - a.family.models.length;
      return (a.rank < 0 ? 99 : a.rank) - (b.rank < 0 ? 99 : b.rank);
    });

  return (
    <div className="models-page">
      <header className="lib-head">
        <div>
          <h1>{t.title}</h1>
          <p className="dim">{t.lead(totalModels, all.length)}</p>
        </div>
      </header>

      <div className="models-toolbar">
        <label className="models-search">
          <Icon name="search" size={18} />
          <span className="sr-only">{t.searchLabel}</span>
          <input type="search" value={query} placeholder={t.search} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="filters" role="group" aria-label={COPY.gallery.filters}>
          {Object.entries(FILTERS).map(([id, label]) => (
            <button type="button" key={id} aria-pressed={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <label className="models-sort">
          <span className="dim">{t.sort.label}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">{t.sort.featured}</option>
            <option value="az">{t.sort.az}</option>
            <option value="modes">{t.sort.modes}</option>
          </select>
        </label>
      </div>
      <p className="models-count mono dim" role="status">{t.count(list.length)}</p>

      {list.length ? (
        <div className="mgrid">
          {list.map((x) => <FamilyCard key={`${x.studio}-${x.family.id}`} family={x.family} studio={x.studio} badge={x.badge} onOpen={onOpen} />)}
        </div>
      ) : (
        <div className="state-screen">
          <Avatar size="md" mood="empty" />
          <p>{t.empty}</p>
          <button type="button" className="pill-btn" onClick={() => { setQuery(''); setFilter('all'); }}>{t.clear}</button>
        </div>
      )}
    </div>
  );
}

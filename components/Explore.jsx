'use client';
import { useMemo, useState } from 'react';
import { familiesForStudio, FEATURED } from '@/lib/catalog';
import { useJobs, withArchive } from '@/lib/jobs';
import Icon from './Icon';

const KIND = { image: 'Imagen', video: 'Video', transform: 'Transformar' };

function Glyph({ kind }) {
  if (kind === 'image') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
    );
  }
  if (kind === 'transform') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8h11l-3-3M20 16H9l3 3" /></svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="5" width="13" height="14" rx="3" /><path d="m16 10 5-3v10l-5-3" /></svg>
  );
}

function ModelTile({ family, studio, badge, onOpen }) {
  return (
    <button type="button" className="tile" onClick={() => onOpen(studio, family.models[0].id)}>
      <span className="tile-top">
        <span className="tile-icon"><Glyph kind={studio} /></span>
        <span className="tile-kind">{KIND[studio]}</span>
      </span>
      <span className="tile-name">
        {family.name}
        {badge && <em className={`tag tag-${badge.toLowerCase()}`}>{badge}</em>}
      </span>
      <span className="tile-desc">{family.description}</span>
    </button>
  );
}

// Banners promocionales: composiciones tipográficas con etiquetas inclinadas.
const BANNERS = [
  {
    studio: 'video', model: 'seedance-2-5/text-to-video', art: 'art-a',
    over: 'Nuevo en EDAVI', lines: ['SEEDANCE', '2.5'], sub: 'Video con audio nativo',
    title: 'Seedance 2.5', text: 'Genera, edita y extiende video hasta 30 s con referencias.',
  },
  {
    studio: 'image', model: 'soul-2/generate', art: 'art-b',
    over: 'Retrato · Moda · Editorial', lines: ['SOUL', 'V2'], sub: 'Estilos de revista',
    title: 'SOUL V2', text: 'Retratos editoriales con estilos y tu propio personaje.',
  },
  {
    studio: 'transform', model: 'kling-3-motion-control/pro', art: 'art-c',
    over: 'Motion control', lines: ['MUEVE', 'TU FOTO'], sub: 'Kling 3.0',
    title: 'Kling 3.0 Motion Control', text: 'Copia el movimiento de un video a cualquier imagen.',
  },
  {
    studio: 'video', model: 'cinema-studio-4/generate', art: 'art-d',
    over: 'Dirección de fotografía', lines: ['CINEMA', 'STUDIO 4'], sub: 'Cámara · Lente · Luz',
    title: 'Cinema Studio 4.0', text: 'Planos de cine con control total de cámara y época.',
  },
];

export default function Explore({ onOpen }) {
  const jobs = useJobs();
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => ['image', 'video', 'transform'].map((studio) => ({ studio, families: familiesForStudio(studio) })), []);
  const featured = useMemo(() => FEATURED.map((f) => {
    const family = groups.find((g) => g.studio === f.studio)?.families.find((x) => x.id === f.family);
    return family ? { ...f, family } : null;
  }).filter(Boolean), [groups]);
  const creations = useMemo(() => jobs.map(withArchive).filter((j) => j.status === 'completed')
    .flatMap((j) => j.outputs.filter((o) => o.type !== 'audio').map((o) => ({ ...o, job: j }))).slice(0, 24), [jobs]);
  const total = groups.reduce((n, g) => n + g.families.reduce((m, f) => m + f.models.length, 0), 0);

  const catalog = groups.filter((g) => filter === 'all' || g.studio === filter).flatMap((g) => g.families.map((family) => ({ g, family })));
  const PROMPT_COUNT = '1.526';

  return (
    <div className="explore">
      <section className="hero" aria-label="EDAVI Studio">
        <div className="hero-copy">
          <span className="eyebrow"><i aria-hidden /> Estudio creativo con IA · Higgsfield</span>
          <h1>
            <span className="hero-line dim-line">Imagina cualquier cosa.</span>
            <span className="hero-line shine">Créala en segundos.</span>
            <span className="hero-line">Imagen y video de cine.</span>
          </h1>
          <p className="hero-sub">
            {total} modelos de IA en un solo estudio: SOUL, Seedance, Kling, Wan, MiniMax y más.
            Con biblioteca de prompts, comparación de modelos, flujos automáticos y tu propio avatar.
          </p>
          <div className="hero-ctas">
            <button type="button" className="cta" onClick={() => onOpen('image')}><Icon name="sparkles" /> Empezar a crear</button>
            <button type="button" className="pill-btn hero-ghost" onClick={() => onOpen('prompts')}>Ver {PROMPT_COUNT} prompts ›</button>
          </div>
          <dl className="hero-stats">
            <div><dt>{total}</dt><dd>Modelos</dd></div>
            <div><dt>{PROMPT_COUNT}</dt><dd>Prompts</dd></div>
            <div><dt>4K</dt><dd>Video</dd></div>
            <div><dt>×4</dt><dd>Variaciones</dd></div>
          </dl>
        </div>
        <div className="hero-visual" aria-hidden>
          <span className="orbit orbit-1" />
          <span className="orbit orbit-2" />
          <span className="orbit orbit-3" />
          <span className="hero-halo" />
          <img className="hero-avatar" src="/edavi-avatar.png" alt="" width="320" height="320" />
          <span className="float-chip chip-a"><Icon name="film" size={15} /> Seedance 2.5</span>
          <span className="float-chip chip-b"><Icon name="camera" size={15} /> SOUL V2</span>
          <span className="float-chip chip-c"><Icon name="video" size={15} /> Kling 3.0</span>
        </div>
      </section>

      <section className="banners" aria-label="Destacados">
        {BANNERS.map((b) => (
          <button type="button" key={b.title} className="banner" onClick={() => onOpen(b.studio, b.model)}>
            <span className={`banner-art ${b.art}`}>
              <span className="sticker-over">{b.over}</span>
              <span className="sticker sticker-1">{b.lines[0]}</span>
              <span className="sticker sticker-2">{b.lines[1]}</span>
              <span className="sticker-sub">{b.sub}</span>
            </span>
            <span className="banner-title">{b.title}</span>
            <span className="banner-text">{b.text}</span>
          </button>
        ))}
      </section>

      <section className="featured">
        <header className="section-head">
          <h2>Destacados</h2>
          <p className="dim">Los modelos más potentes para empezar.</p>
        </header>
        <div className="tiles tiles-featured">
          {featured.map((f) => <ModelTile key={f.family.id} family={f.family} studio={f.studio} badge={f.badge} onOpen={onOpen} />)}
        </div>
      </section>

      <section className="catalog">
        <header className="section-head">
          <h2>Todos los modelos</h2>
          <div className="filters" role="tablist">
            {[['all', 'Todos'], ['image', 'Imagen'], ['video', 'Video'], ['transform', 'Transformar']].map(([id, label]) => (
              <button type="button" role="tab" key={id} aria-selected={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
        </header>
        <div className="tiles tiles-wide">
          {(showAll ? catalog : catalog.slice(0, 12)).map(({ g, family }) => (
            <ModelTile key={`${g.studio}-${family.id}`} family={family} studio={g.studio}
              badge={FEATURED.find((f) => f.family === family.id)?.badge} onOpen={onOpen} />
          ))}
        </div>
        {catalog.length > 12 && (
          <div className="plib-more">
            <button type="button" className="pill-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Ver menos' : `Ver los ${catalog.length} modelos`}
            </button>
          </div>
        )}
      </section>

      <section className="creations">
        <header className="section-head">
          <h2>Tus creaciones</h2>
          <p className="dim">Lo que generes aparece aquí, guardado en este navegador.</p>
        </header>
        {creations.length ? (
          <div className="masonry">
            {creations.map((c, i) => (
              <button type="button" key={c.url + i} className="masonry-item" onClick={() => onOpen(c.job.studio, c.job.modelId, c.job.payload)}>
                {c.type === 'video'
                  ? <video src={c.url} muted loop playsInline autoPlay />
                  : <img src={c.url} alt="" loading="lazy" />}
                <span className="masonry-meta">{c.job.family}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="masonry masonry-empty">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => <span key={k} className={`ghost ghost-${k}`} aria-hidden />)}
            <div className="masonry-cta">
              <p>Tu galería está vacía</p>
              <button type="button" className="cta" onClick={() => onOpen('video')}>Crear mi primer video</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

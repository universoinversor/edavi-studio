'use client';
import { useMemo, useState } from 'react';
import { familiesForStudio, FEATURED } from '@/lib/catalog';
import { useJobs, withArchive } from '@/lib/jobs';
import { useMascotMood } from '@/lib/mascot';
import { COPY } from '@/lib/copy';
import Avatar from './Avatar';
import Dashboard from './Dashboard';
import Icon from './Icon';

const t = COPY.explore;
const PROMPT_COUNT = '1.526';

// Destino y estilo visual de cada banner (los textos están en lib/copy.js).
const BANNER_TARGETS = [
  { studio: 'video', model: 'seedance-2-5/text-to-video', art: 'art-a' },
  { studio: 'image', model: 'soul-2/generate', art: 'art-b' },
  { studio: 'transform', model: 'kling-3-motion-control/pro', art: 'art-c' },
  { studio: 'video', model: 'cinema-studio-4/generate', art: 'art-d' },
];

function Glyph({ kind }) {
  if (kind === 'image') return <Icon name="camera" size={20} />;
  if (kind === 'transform') return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M4 8h11l-3-3M20 16H9l3 3" /></svg>;
  return <Icon name="video" size={20} />;
}

function ModelTile({ family, studio, badge, onOpen }) {
  return (
    <button type="button" className="tile" onClick={() => onOpen(studio, family.models[0].id)}>
      <span className="tile-top">
        <span className="tile-icon"><Glyph kind={studio} /></span>
        <span className="tile-kind">{t.kinds[studio]}</span>
      </span>
      <span className="tile-name">
        {family.name}
        {badge && <em className={`tag tag-${badge.toLowerCase()}`}>{badge}</em>}
      </span>
      <span className="tile-desc">{family.description}</span>
    </button>
  );
}

export default function Explore({ onOpen }) {
  const jobs = useJobs();
  const mood = useMascotMood();
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

  return (
    <div className="explore">
      <Dashboard onOpen={onOpen} />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow"><i aria-hidden /> {t.eyebrow}</span>
          <h2 id="hero-title">
            <span className="hero-line dim-line">{t.hero[0]}</span>
            <span className="hero-line shine">{t.hero[1]}</span>
            <span className="hero-line">{t.hero[2]}</span>
          </h2>
          <p className="hero-sub">{t.sub(total)}</p>
          <div className="hero-ctas">
            <button type="button" className="cta" onClick={() => onOpen('image')}><Icon name="sparkles" /> {t.ctaPrimary}</button>
            <button type="button" className="pill-btn hero-ghost" onClick={() => onOpen('prompts')}>{t.ctaPrompts(PROMPT_COUNT)} ›</button>
          </div>
          <dl className="hero-stats">
            <div><dt>{total}</dt><dd>{t.stats.models}</dd></div>
            <div><dt>{PROMPT_COUNT}</dt><dd>{t.stats.prompts}</dd></div>
            <div><dt>4K</dt><dd>{t.stats.video}</dd></div>
            <div><dt>×4</dt><dd>{t.stats.variations}</dd></div>
          </dl>
        </div>
        <div className="hero-visual">
          <span className="orbit orbit-1" aria-hidden />
          <span className="orbit orbit-2" aria-hidden />
          <span className="orbit orbit-3" aria-hidden />
          <Avatar size="xl" mood={mood} speak={mood !== 'idle'} decorative={false} className="hero-mascot" />
          <span className="float-chip chip-a" aria-hidden><Icon name="film" size={15} /> Seedance 2.5</span>
          <span className="float-chip chip-b" aria-hidden><Icon name="camera" size={15} /> SOUL V2</span>
          <span className="float-chip chip-c" aria-hidden><Icon name="video" size={15} /> Kling 3.0</span>
        </div>
      </section>

      <section className="banners" aria-label={t.bannersLabel}>
        {t.banners.map((b, i) => {
          const target = BANNER_TARGETS[i];
          return (
            <button type="button" key={b.title} className="banner" onClick={() => onOpen(target.studio, target.model)}>
              <span className={`banner-art ${target.art}`} aria-hidden>
                <span className="sticker-over">{b.over}</span>
                <span className="sticker sticker-1">{b.lines[0]}</span>
                <span className="sticker sticker-2">{b.lines[1]}</span>
                <span className="sticker-sub">{b.sub}</span>
              </span>
              <span className="banner-title">{b.title}</span>
              <span className="banner-text">{b.text}</span>
            </button>
          );
        })}
      </section>

      <section className="featured" aria-labelledby="featured-title">
        <header className="section-head">
          <h2 id="featured-title">{t.featured[0]}</h2>
          <p className="dim">{t.featured[1]}</p>
        </header>
        <div className="tiles tiles-featured">
          {featured.map((f) => <ModelTile key={f.family.id} family={f.family} studio={f.studio} badge={f.badge} onOpen={onOpen} />)}
        </div>
      </section>

      <section className="catalog" aria-labelledby="catalog-title">
        <header className="section-head">
          <h2 id="catalog-title">{t.all}</h2>
          <div className="filters" role="group" aria-label={COPY.gallery.filters}>
            {Object.entries(t.filters).map(([id, label]) => (
              <button type="button" key={id} aria-pressed={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
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
            <button type="button" className="pill-btn" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? t.showLess : t.showAll(catalog.length)}
            </button>
            <button type="button" className="pill-btn" onClick={() => onOpen('models')}><Icon name="layers" size={16} /> {COPY.dashboard.models}</button>
          </div>
        )}
      </section>

      <section className="creations" aria-labelledby="creations-title">
        <header className="section-head">
          <h2 id="creations-title">{t.creations[0]}</h2>
          <p className="dim">{t.creations[1]}</p>
          {creations.length > 0 && <button type="button" className="pill-btn section-action" onClick={() => onOpen('library')}><Icon name="grid" size={16} /> {t.seeLibrary}</button>}
        </header>
        {creations.length ? (
          <div className="masonry">
            {creations.map((c, i) => (
              <button type="button" key={c.url + i} className="masonry-item" onClick={() => onOpen(c.job.studio, c.job.modelId, c.job.payload)} aria-label={`${c.job.family}: ${c.job.payload?.prompt || ''}`}>
                {c.type === 'video'
                  ? <video src={c.url} muted loop playsInline autoPlay />
                  : <img src={c.url} alt="" loading="lazy" decoding="async" />}
                <span className="masonry-meta">{c.job.family}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="masonry masonry-empty">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => <span key={k} className={`ghost ghost-${k}`} aria-hidden />)}
            <div className="masonry-cta">
              <Avatar size="md" mood="empty" />
              <p>{t.emptyCreations}</p>
              <button type="button" className="cta" onClick={() => onOpen('video')}>{t.emptyCta}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

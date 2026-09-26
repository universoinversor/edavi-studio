'use client';
import { useEffect, useMemo, useState } from 'react';
import { storage } from '@/lib/providers';
import { familiesForStudio, FEATURED, models as allModels } from '@/lib/catalog';
import { useJobs, withArchive } from '@/lib/jobs';
import { useAuth } from '@/lib/auth';
import { useMascotMood } from '@/lib/mascot';
import { exampleForEndpoint } from '@/lib/examples';
import { PREMIERE } from '@/lib/premiere';
import { COPY } from '@/lib/copy';
import Avatar from './Avatar';
import Dashboard from './Dashboard';
import ExampleMedia from './ExampleMedia';
import { FamilyCard } from './Models';
import Icon from './Icon';

const t = COPY.explore;
const PROMPT_COUNT = '1.526';
const HERO_EXAMPLE = 'bytedance/seedance-2.5/text-to-video';

// Destino y estilo visual de cada banner (los textos están en lib/copy.js).
const BANNER_TARGETS = [
  { studio: 'video', model: 'seedance-2-5/text-to-video', art: 'art-a', example: 'bytedance/seedance-2.5/text-to-video' },
  { studio: 'image', model: 'soul-2/generate', art: 'art-b', example: 'higgsfield-ai/soul/v2/standard' },
  { studio: 'transform', model: 'kling-3-motion-control/pro', art: 'art-c', example: 'kling-video/v3.0/std/text-to-video' },
  { studio: 'video', model: 'cinema-studio-4/generate', art: 'art-d', example: 'higgsfield/cinema-studio/4.0' },
];

function firstName(session) {
  const meta = session?.user?.user_metadata || {};
  const raw = meta.full_name || meta.name || session?.user?.email?.split('@')[0] || '';
  return raw ? raw.split(/[\s._-]/)[0] : COPY.dashboard.guest;
}

function Hero({ onOpen, total }) {
  const { session } = useAuth();
  const mood = useMascotMood();
  const [hour, setHour] = useState(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const example = exampleForEndpoint(HERO_EXAMPLE);

  return (
    <section className="cine" aria-labelledby="hero-title">
      <div className="cine-media" aria-hidden>
        <ExampleMedia example={example} autoPlay credit={false} />
      </div>
      <div className="cine-copy">
        <p className="cine-kicker">
          <span className="cine-dot" aria-hidden />
          {hour === null ? t.eyebrow : `${COPY.dashboard.greeting(hour)}, ${firstName(session)} · ${t.eyebrow}`}
        </p>
        <h1 id="hero-title" className="cine-title">
          <span>{t.hero[0]}</span>
          <span className="shine">{t.hero[1]}</span>
          <span>{t.hero[2]}</span>
        </h1>
        <p className="cine-sub">{t.sub(total)}</p>
        <div className="cine-ctas">
          <button type="button" className="cta" onClick={() => onOpen('image')}><Icon name="sparkles" /> {t.ctaPrimary}</button>
          <button type="button" className="pill-btn cine-ghost" onClick={() => onOpen('models')}><Icon name="layers" size={16} /> {t.allModels(total)}</button>
          <button type="button" className="pill-btn cine-ghost" onClick={() => onOpen('prompts')}>{t.ctaPrompts(PROMPT_COUNT)}</button>
        </div>
        <dl className="cine-stats">
          <div><dt>{total}</dt><dd>{t.stats.models}</dd></div>
          <div><dt>{PROMPT_COUNT}</dt><dd>{t.stats.prompts}</dd></div>
          <div><dt>4K</dt><dd>{t.stats.video}</dd></div>
          <div><dt>×4</dt><dd>{t.stats.variations}</dd></div>
        </dl>
      </div>
      <div className="cine-mascot">
        <Avatar size="lg" mood={mood} speak={mood !== 'idle'} decorative={false} />
      </div>
      <span className="cine-caption mono" aria-hidden>{t.heroCaption}</span>
    </section>
  );
}

export default function Explore({ onOpen, showcase = false }) {
  const jobs = useJobs();
  const [gallery, setGallery] = useState([]);
  useEffect(() => {
    if (!showcase) return undefined;
    let alive = true;
    storage.fetchShowcase(24).then((rows) => { if (alive) setGallery(rows); });
    return () => { alive = false; };
  }, [showcase]);

  const featured = useMemo(() => FEATURED.map((f) => {
    const family = familiesForStudio(f.studio).find((x) => x.id === f.family);
    return family ? { ...f, family } : null;
  }).filter(Boolean).slice(0, 8), []);
  const creations = useMemo(() => (showcase ? gallery : jobs).map(withArchive).filter((j) => j.status === 'completed')
    .flatMap((j) => j.outputs.filter((o) => o.type !== 'audio').map((o) => ({ ...o, job: j }))).slice(0, 24), [jobs, gallery, showcase]);
  const total = allModels.length;
  const head = showcase ? t.showcase : t.creations;

  return (
    <div className="explore">
      <Hero onOpen={onOpen} total={total} />
      {!showcase && <Dashboard onOpen={onOpen} compact={false} statsOnly />}

      {PREMIERE && (
        <section className="premiere" aria-labelledby="premiere-title">
          <div className="premiere-copy">
            <span className="premiere-kicker mono">{t.premiere.kicker}</span>
            <h2 id="premiere-title">{PREMIERE.title}</h2>
            <p>{PREMIERE.logline}</p>
            <p className="dim premiere-credits">{PREMIERE.credits}</p>
          </div>
          <video className="premiere-player" src={PREMIERE.src} poster={PREMIERE.poster} controls playsInline preload="metadata" />
        </section>
      )}

      <section className="banners banners-grid" aria-label={t.bannersLabel}>
        {t.banners.map((b, i) => {
          const target = BANNER_TARGETS[i];
          return (
            <button type="button" key={b.title} className="banner" onClick={() => onOpen(target.studio, target.model)}>
              <span className={`banner-art ${target.art}`} aria-hidden>
                <ExampleMedia example={exampleForEndpoint(target.example)} autoPlay credit={false} />
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
          <button type="button" className="pill-btn section-action" onClick={() => onOpen('models')}>
            {t.allModels(total)} <Icon name="arrowRight" size={16} />
          </button>
        </header>
        <div className="mgrid mgrid-featured">
          {featured.map((f) => <FamilyCard key={`${f.studio}-${f.family.id}`} family={f.family} studio={f.studio} badge={f.badge} onOpen={onOpen} />)}
        </div>
        <p className="examples-note dim">{t.examplesNote}</p>
      </section>

      <section className="creations" aria-labelledby="creations-title">
        <header className="section-head">
          <h2 id="creations-title">{head[0]}</h2>
          <p className="dim">{head[1]}</p>
          {creations.length > 0 && !showcase && <button type="button" className="pill-btn section-action" onClick={() => onOpen('library')}><Icon name="grid" size={16} /> {t.seeLibrary}</button>}
        </header>
        {creations.length ? (
          <div className="shots">
            {creations.map((c, i) => (
              <button type="button" key={c.url + i} className="shot" onClick={() => onOpen(c.job.studio, c.job.modelId, c.job.payload)} aria-label={`${c.job.family}: ${c.job.payload?.prompt || ''}`}>
                {c.type === 'video'
                  ? <video src={c.url} muted loop playsInline autoPlay preload="metadata" />
                  : <img src={c.url} alt="" loading="lazy" decoding="async" />}
                <span className="shot-meta">
                  <b>{c.job.family}</b>
                  {c.job.payload?.prompt && <span>{c.job.payload.prompt}</span>}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="masonry masonry-empty">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => <span key={k} className={`ghost ghost-${k}`} aria-hidden />)}
            <div className="masonry-cta">
              <Avatar size="md" mood="empty" />
              <p>{showcase ? t.emptyShowcase : t.emptyCreations}</p>
              {!showcase && <button type="button" className="cta" onClick={() => onOpen('video')}>{t.emptyCta}</button>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

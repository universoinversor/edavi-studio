'use client';
import { useMemo, useState } from 'react';
import { archiveJob, removeJobs, setFavorites, toggleFavorite, useJobs, withArchive } from '@/lib/jobs';
import { useAuth } from '@/lib/auth';
import { statusLabel } from '@/lib/errors';
import { TERMINAL } from '@/lib/schema';
import { workflowLabel } from '@/lib/catalog';
import { COPY } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { Lightbox, downloadJob } from './media';
import Avatar from './Avatar';
import Portal from './Portal';
import Icon from './Icon';

const t = COPY.library;
const PAGE = 48;

const TYPES = [
  ['all', () => true],
  ['image', (j) => j.output === 'image'],
  ['video', (j) => j.output === 'video'],
  ['favorites', (j) => j.favorite],
  ['failed', (j) => ['failed', 'nsfw', 'error'].includes(j.status)],
];
const SORTS = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  cost: (a, b) => Number(b.estimate?.credits || 0) - Number(a.estimate?.credits || 0),
};

function Card({ job, index, total, selecting, selected, onToggle, onOpen, onReuse }) {
  const ok = job.status === 'completed';
  const cover = job.outputs[0];
  const running = !TERMINAL.has(job.status) && job.status !== 'error';
  const label = t.item(index + 1, total);
  const main = () => (selecting ? onToggle(job.localId) : ok ? onOpen(job) : onReuse(job));
  return (
    <article className={`lib-card ${selected ? 'selected' : ''} status-${job.status}`}>
      <button type="button" className="lib-thumb" onClick={main} aria-label={`${label}: ${job.family}`}
        aria-pressed={selecting ? selected : undefined}>
        {ok && cover?.type === 'video' && <video src={cover.url} muted playsInline preload="metadata" />}
        {ok && cover?.type === 'image' && <img src={cover.url} alt="" loading="lazy" decoding="async" />}
        {!ok && (
          <span className={`lib-state ${running ? 'running' : 'failed'}`}>
            <Icon name={running ? 'refresh' : 'alert'} size={22} />
            {statusLabel(job.status)}
          </span>
        )}
        {job.outputs.length > 1 && <span className="lib-count mono">×{job.outputs.length}</span>}
        {cover?.type === 'video' && <span className="lib-kind"><Icon name="video" size={14} /></span>}
        {selecting && <span className={`lib-check ${selected ? 'on' : ''}`} aria-hidden><Icon name="check" size={16} /></span>}
      </button>
      <div className="lib-meta">
        <b>{job.family}</b>
        <span className="dim">{workflowLabel(job.workflow)}</span>
        {!selecting && (
          <button type="button" className={`fav ${job.favorite ? 'on' : ''}`} onClick={() => toggleFavorite(job.localId)}
            aria-pressed={job.favorite} aria-label={job.favorite ? COPY.gallery.favRemove : COPY.gallery.favAdd}>
            <Icon name="star" filled={job.favorite} />
          </button>
        )}
      </div>
      {job.payload?.prompt && <p className="lib-prompt" title={job.payload.prompt}>{job.payload.prompt}</p>}
    </article>
  );
}

// Biblioteca: todas las creaciones con filtros, orden, selección y acciones en lote.
export default function Library({ onReuse, onCreate }) {
  const raw = useJobs();
  const jobs = useMemo(() => raw.map(withArchive), [raw]);
  const { session } = useAuth();
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [open, setOpen] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = TYPES.find(([id]) => id === type)[1];
    return jobs.filter((j) => match(j) && (!q || `${j.payload?.prompt || ''} ${j.family}`.toLowerCase().includes(q)))
      .sort(SORTS[sort]);
  }, [jobs, type, sort, query]);
  const visible = filtered.slice(0, limit);
  const picked = filtered.filter((j) => selected.has(j.localId));

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const exitSelect = () => { setSelecting(false); setSelected(new Set()); };

  async function bulk(action) {
    const ids = picked.map((j) => j.localId);
    if (!ids.length) return;
    if (action === 'download') picked.filter((j) => j.status === 'completed').forEach((j, i) => setTimeout(() => downloadJob(j), i * 700));
    if (action === 'favorite') setFavorites(ids, !picked.every((j) => j.favorite));
    if (action === 'save') {
      const pending = picked.filter((j) => j.status === 'completed' && !j.saved);
      await Promise.allSettled(pending.map((j) => archiveJob(j.localId)));
      toast(COPY.toasts.saved, { tone: 'success' });
    }
    if (action === 'remove') {
      if (!window.confirm(t.removeConfirm(ids.length))) return;
      removeJobs(ids);
      toast(COPY.toasts.removed(ids.length));
      exitSelect();
    }
  }

  if (!jobs.length) {
    return (
      <section className="library stage-main" aria-labelledby="lib-title">
        <h1 id="lib-title" className="sr-only">{t.title}</h1>
        <div className="empty">
          <Avatar mood="empty" size="lg" speak message={t.emptyTitle} />
          <p className="dim">{t.emptyText}</p>
          <button type="button" className="cta" onClick={onCreate}><Icon name="sparkles" /> {t.emptyCta}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="library stage-main" aria-labelledby="lib-title">
      <header className="lib-head">
        <div>
          <h1 id="lib-title">{t.title}</h1>
          <p className="dim">{t.sub(jobs.length)}</p>
        </div>
        <div className="lib-tools">
          <input type="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.search} />
          <label className="lib-sort">
            <span className="sr-only">{t.sort.label}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.keys(SORTS).map((k) => <option key={k} value={k}>{t.sort[k]}</option>)}
            </select>
          </label>
          <button type="button" className={`pill-btn ${selecting ? 'on' : ''}`} onClick={() => (selecting ? exitSelect() : setSelecting(true))} aria-pressed={selecting}>
            {selecting ? t.cancelSelect : t.select}
          </button>
        </div>
      </header>

      <div className="filters lib-filters" role="group" aria-label={COPY.gallery.filters}>
        {TYPES.map(([id]) => (
          <button type="button" key={id} className={type === id ? 'on' : ''} aria-pressed={type === id} onClick={() => setType(id)}>
            {t.type[id]} <span className="mono dim">{jobs.filter(TYPES.find(([k]) => k === id)[1]).length}</span>
          </button>
        ))}
      </div>

      {selecting && (
        <div className="lib-bulk" role="toolbar" aria-label={t.selected(picked.length)}>
          <span className="mono" aria-live="polite">{t.selected(picked.length)}</span>
          <button type="button" className="link-btn" onClick={() => setSelected(new Set(filtered.map((j) => j.localId)))}>{t.selectAll}</button>
          <span className="lib-bulk-actions">
            <button type="button" className="pill-btn" disabled={!picked.length} onClick={() => bulk('download')}><Icon name="download" size={16} /> {t.bulk.download}</button>
            <button type="button" className="pill-btn" disabled={!picked.length} onClick={() => bulk('favorite')}><Icon name="star" size={16} /> {t.bulk.favorite}</button>
            {session && <button type="button" className="pill-btn" disabled={!picked.length} onClick={() => bulk('save')}><Icon name="cloud" size={16} /> {t.bulk.save}</button>}
            <button type="button" className="pill-btn danger" disabled={!picked.length} onClick={() => bulk('remove')}><Icon name="trash" size={16} /> {t.bulk.remove}</button>
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty"><Avatar mood="empty" size="sm" /><p className="dim">{COPY.gallery.emptySearch}</p></div>
      ) : (
        <div className="lib-grid">
          {visible.map((job, i) => (
            <Card key={job.localId} job={job} index={i} total={filtered.length} selecting={selecting} selected={selected.has(job.localId)}
              onToggle={toggle} onOpen={(j) => setOpen(j)} onReuse={onReuse} />
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <div className="plib-more">
          <button type="button" className="pill-btn" onClick={() => setLimit((l) => l + PAGE)}>{COPY.prompts.more(filtered.length - limit)}</button>
        </div>
      )}
      {open && <Portal><Lightbox job={open} index={0} onClose={() => setOpen(null)} /></Portal>}
    </section>
  );
}

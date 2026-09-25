'use client';
import { useEffect, useMemo, useState } from 'react';
import { archiveJob, cancelJob, clearFinished, removeJob, toggleFavorite, useJobs, withArchive } from '@/lib/jobs';
import { useAuth } from '@/lib/auth';
import { statusLabel, friendlyError } from '@/lib/errors';
import { TERMINAL } from '@/lib/schema';
import { workflowLabel } from '@/lib/catalog';
import { COPY } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { Lightbox, Media, download, fileName } from './media';
import Avatar from './Avatar';
import Portal from './Portal';
import Icon from './Icon';

const t = COPY.gallery;
const WEEK = 7 * 24 * 3600 * 1000;
const HOW_ART = ['how-a', 'how-b', 'how-c'];

function elapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

export function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export function Frame({ job, index, now, onReuse, onUseAsInput, onOpen, loggedIn }) {
  const done = TERMINAL.has(job.status) || job.status === 'error';
  const ok = job.status === 'completed';
  const [problem, setProblem] = useState(null);
  const [saving, setSaving] = useState(false);
  const expired = ok && !job.saved && now - job.createdAt > WEEK;
  async function save() {
    setSaving(true);
    setProblem(null);
    try { await archiveJob(job.localId); toast(COPY.toasts.saved, { tone: 'success' }); } catch (e) { setProblem(friendlyError(e)); } finally { setSaving(false); }
  }
  const ratio = job.payload?.aspect_ratio && /^\d+:\d+$/.test(job.payload.aspect_ratio) ? job.payload.aspect_ratio.replace(':', ' / ') : job.output === 'video' ? '16 / 9' : '1 / 1';
  const first = job.outputs[0];
  return (
    <article className={`frame status-${job.status}`} style={/** @type {any} */ ({ '--i': index })} aria-label={`${job.family} · ${statusLabel(job.status)}`}>
      <div className="frame-edge mono">
        <span>{String(index + 1).padStart(3, '0')}</span>
        <span className="frame-status">{statusLabel(job.status)}</span>
        {!done && <span>{elapsed(now - job.createdAt)}</span>}
        <button type="button" className={`fav ${job.favorite ? 'on' : ''}`} onClick={() => toggleFavorite(job.localId)}
          aria-pressed={job.favorite} aria-label={job.favorite ? t.favRemove : t.favAdd}><Icon name="star" filled={job.favorite} /></button>
      </div>

      <div className={`frame-media ${job.outputs.length > 1 ? 'multi' : ''}`} style={{ aspectRatio: job.outputs.length > 1 ? undefined : ratio }}>
        {ok && job.outputs.map((o, i) => <Media key={o.url + i} output={o} alt={job.payload?.prompt || job.family} onOpen={() => onOpen(job, i)} />)}
        {!done && <div className="developing" role="status"><i /><span className="mono">{job.status === 'local_queue' ? t.waiting : t.generating}</span></div>}
        {done && !ok && (
          <div className="frame-failed">
            <b>{statusLabel(job.status)}</b>
            <p>{job.error || t.noDetails}</p>
            {job.status === 'failed' || job.status === 'nsfw' ? <p className="dim mono">{t.noCharge}</p> : null}
          </div>
        )}
      </div>

      <div className="frame-meta">
        <div className="frame-title">
          <b>{job.family}</b>
          <span className="dim">{workflowLabel(job.workflow)}</span>
        </div>
        {(job.label || job.estimate || job.then || job.saved) && (
          <div className="frame-tags">
            {job.label && <span className="ftag">{job.label}</span>}
            {job.then && <span className="ftag ftag-flow">{job.chainedTo ? t.flowLaunched : t.flowPending}</span>}
            {job.saved && <span className="ftag ftag-saved"><Icon name="cloud" size={13} /> {t.inCloud}</span>}
            {job.estimate && <span className="ftag ftag-cost">{t.credits(Number(job.estimate.credits).toFixed(2))}</span>}
          </div>
        )}
        {job.payload?.prompt && <p className="frame-prompt" title={job.payload.prompt}>{job.payload.prompt}</p>}
        {expired && <p className="hint">{t.expired}</p>}
        {problem && <p className="field-error" role="alert">{problem}</p>}
        <div className="frame-actions">
          {!done && job.status !== 'in_progress' && job.status !== 'submitting' && (
            <button type="button" onClick={() => cancelJob(job.localId).catch((e) => setProblem(e.status === 400 ? t.cannotCancel : friendlyError(e)))}>{t.cancel}</button>
          )}
          {ok && job.outputs.map((o, i) => (
            <button type="button" key={o.url} onClick={() => download(o.url, fileName(job, o, i))} aria-label={`${t.download}${job.outputs.length > 1 ? ` ${i + 1}` : ''}`}>
              <Icon name="download" size={15} />{job.outputs.length > 1 ? ` ${i + 1}` : ''}
            </button>
          ))}
          {ok && first?.type !== 'audio' && (
            <button type="button" onClick={() => onUseAsInput(first)} title={first?.type === 'image' ? t.animateHint : t.transformHint}>
              {first?.type === 'image' ? t.animate : t.transform}
            </button>
          )}
          {ok && loggedIn && !job.saved && (
            <button type="button" onClick={save} disabled={saving} title={t.saveHint}>{saving ? t.saving : <><Icon name="cloud" size={15} /> {t.save}</>}</button>
          )}
          <button type="button" onClick={() => onReuse(job)}>{t.reuse}</button>
          {done && <button type="button" className="dim" onClick={() => removeJob(job.localId)} aria-label={t.remove}><Icon name="x" size={15} /></button>}
        </div>
      </div>
    </article>
  );
}

function HowItWorks({ studio }) {
  const how = t.howSteps[studio] || t.howSteps.image;
  return (
    <div className="how">
      <h2>{how.title}</h2>
      <p className="how-sub">{how.sub}</p>
      <div className="how-steps">
        {how.steps.map(([title, text], i) => (
          <article key={title} className="how-card">
            <span className="how-n mono">{String(i + 1).padStart(2, '0')}</span>
            <h3>{title}</h3>
            <p>{text}</p>
            <div className={`how-art ${HOW_ART[i]}`} aria-hidden />
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Gallery({ studio, onReuse, onUseAsInput }) {
  const rawJobs = useJobs();
  const jobs = useMemo(() => rawJobs.map(withArchive), [rawJobs]);
  const { session } = useAuth();
  const [scope, setScope] = useState('studio');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [view, setView] = useState(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => (scope === 'all' || (scope === 'fav' ? j.favorite : j.studio === studio))
      && (!q || `${j.payload?.prompt || ''} ${j.family}`.toLowerCase().includes(q)));
  }, [jobs, scope, studio, query]);
  const running = jobs.filter((j) => !TERMINAL.has(j.status) && j.status !== 'error').length;
  const now = useNow(running > 0);
  // Sin historial se muestra «Cómo funciona»; con historial, los resultados.
  const tab = view || (jobs.some((j) => j.studio === studio) ? 'history' : 'how');

  return (
    <section className="gallery stage-main" aria-label={t.label}>
      <header className="gallery-head">
        <nav className="view-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setView('history')}>
            <Icon name="history" size={16} /> {t.history}{running ? <i className="dot">{running}</i> : null}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'how'} className={tab === 'how' ? 'on' : ''} onClick={() => setView('how')}>
            <Icon name="book" size={16} /> {t.how}
          </button>
        </nav>
        {tab === 'history' && (
          <div className="gallery-tools">
            {jobs.length > 3 && <input type="search" className="gallery-search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.searchLabel} />}
            <div className="seg" role="group" aria-label={t.filters}>
              <button type="button" aria-pressed={scope === 'studio'} className={scope === 'studio' ? 'on' : ''} onClick={() => setScope('studio')}>{t.thisStudio}</button>
              <button type="button" aria-pressed={scope === 'all'} className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>{t.all}</button>
              <button type="button" aria-pressed={scope === 'fav'} className={scope === 'fav' ? 'on' : ''} onClick={() => setScope('fav')} aria-label={t.favorites}><Icon name="star" size={15} filled={scope === 'fav'} /></button>
            </div>
            {jobs.some((j) => TERMINAL.has(j.status) || j.status === 'error') && (
              <button type="button" className="pill-btn" onClick={() => window.confirm(t.clearConfirm) && clearFinished()}>{t.clear}</button>
            )}
          </div>
        )}
      </header>

      {tab === 'how' ? (
        <HowItWorks studio={studio} />
      ) : shown.length === 0 ? (
        <div className="empty">
          <Avatar mood="empty" size="md" />
          <p className="empty-title">{t.emptyTitle}</p>
          <p className="dim">{query ? t.emptySearch : t.emptyText}</p>
        </div>
      ) : (
        <div className="contact-sheet">
          {shown.map((job, i) => (
            <Frame key={job.localId} job={job} loggedIn={Boolean(session)} index={shown.length - 1 - i} now={now}
              onReuse={onReuse} onUseAsInput={onUseAsInput} onOpen={(j, k) => setOpen({ job: j, index: k })} />
          ))}
        </div>
      )}
      {open && <Portal><Lightbox job={open.job} index={open.index} onClose={() => setOpen(null)} /></Portal>}
    </section>
  );
}

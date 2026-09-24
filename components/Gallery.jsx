'use client';
import { useEffect, useMemo, useState } from 'react';
import { cancelJob, clearFinished, removeJob, useJobs } from '@/lib/jobs';
import { statusLabel, friendlyError } from '@/lib/errors';
import { TERMINAL } from '@/lib/schema';
import { workflowLabel } from '@/lib/catalog';
import Portal from './Portal';

const WEEK = 7 * 24 * 3600 * 1000;

async function download(url, name) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch {
    // El CDN no permite descargar desde el navegador: se abre en otra pestaña.
    window.open(url, '_blank', 'noopener');
  }
}

function extFor(output, url) {
  const m = url.split('?')[0].match(/\.(\w{3,4})$/);
  if (m) return m[1];
  return output.type === 'video' ? 'mp4' : output.type === 'audio' ? 'wav' : 'png';
}

function Media({ output, onOpen }) {
  if (output.type === 'video') {
    return <video src={output.url} muted loop playsInline preload="metadata"
      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
      onMouseLeave={(e) => e.currentTarget.pause()} onClick={onOpen} />;
  }
  if (output.type === 'audio') return <audio src={output.url} controls />;
  return <img src={output.url} alt="" loading="lazy" onClick={onOpen} />;
}

function elapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function Frame({ job, index, now, onReuse, onUseAsInput, onOpen }) {
  const done = TERMINAL.has(job.status) || job.status === 'error';
  const ok = job.status === 'completed';
  const [cancelError, setCancelError] = useState(null);
  const expired = ok && now - job.createdAt > WEEK;
  const ratio = job.payload?.aspect_ratio && /^\d+:\d+$/.test(job.payload.aspect_ratio) ? job.payload.aspect_ratio.replace(':', ' / ') : job.output === 'video' ? '16 / 9' : '1 / 1';
  return (
    <article className={`frame status-${job.status}`} style={{ '--i': index }}>
      <div className="frame-edge mono">
        <span>{String(index + 1).padStart(3, '0')}</span>
        <span className="frame-status">{statusLabel(job.status)}</span>
        {!done && <span>{elapsed(now - job.createdAt)}</span>}
      </div>

      <div className={`frame-media ${job.outputs.length > 1 ? 'multi' : ''}`} style={{ aspectRatio: job.outputs.length > 1 ? undefined : ratio }}>
        {ok && job.outputs.map((o, i) => <Media key={o.url + i} output={o} onOpen={() => onOpen(job, i)} />)}
        {!done && <div className="developing"><i /><span className="mono">{job.status === 'local_queue' ? 'esperando turno' : 'revelando'}</span></div>}
        {done && !ok && (
          <div className="frame-failed">
            <b>{statusLabel(job.status)}</b>
            <p>{job.error || 'Sin detalles.'}</p>
            {job.status === 'failed' || job.status === 'nsfw' ? <p className="dim mono">No se cobran créditos.</p> : null}
          </div>
        )}
      </div>

      <div className="frame-meta">
        <div className="frame-title">
          <b>{job.family}</b>
          <span className="dim">{workflowLabel(job.workflow)}</span>
        </div>
        {job.payload?.prompt && <p className="frame-prompt" title={job.payload.prompt}>{job.payload.prompt}</p>}
        {expired && <p className="hint">Higgsfield conserva los archivos al menos 7 días; puede que ya no estén.</p>}
        {cancelError && <p className="field-error">{cancelError}</p>}
        <div className="frame-actions">
          {!done && job.status !== 'in_progress' && job.status !== 'submitting' && (
            <button type="button" onClick={() => cancelJob(job.localId).catch((e) => setCancelError(e.status === 400 ? 'Ya empezó a procesarse; no se puede cancelar.' : friendlyError(e)))}>Cancelar</button>
          )}
          {ok && job.outputs.map((o, i) => (
            <button type="button" key={o.url} onClick={() => download(o.url, `edavi-${job.requestId?.slice(0, 8) || job.localId}-${i + 1}.${extFor(o, o.url)}`)}>
              ↓{job.outputs.length > 1 ? ` ${i + 1}` : ''}
            </button>
          ))}
          {ok && job.outputs[0]?.type !== 'audio' && (
            <button type="button" onClick={() => onUseAsInput(job.outputs[0])} title={job.outputs[0]?.type === 'image' ? 'Animar esta imagen' : 'Transformar este video'}>
              {job.outputs[0]?.type === 'image' ? 'Animar →' : 'Transformar →'}
            </button>
          )}
          <button type="button" onClick={() => onReuse(job)}>Reusar</button>
          {done && <button type="button" className="dim" onClick={() => removeJob(job.localId)} aria-label="Eliminar del historial">×</button>}
        </div>
      </div>
    </article>
  );
}

function Lightbox({ job, index, onClose }) {
  const [i, setI] = useState(index);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, job.outputs.length - 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [job, onClose]);
  const o = job.outputs[i];
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label="Vista ampliada">
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        {o.type === 'video' ? <video src={o.url} controls autoPlay loop playsInline /> : <img src={o.url} alt="" />}
        <div className="lightbox-bar mono">
          <span>{job.family} · {workflowLabel(job.workflow)}</span>
          {job.outputs.length > 1 && <span>{i + 1}/{job.outputs.length}</span>}
          <a href={o.url} target="_blank" rel="noreferrer">abrir original ↗</a>
          <button type="button" onClick={onClose}>cerrar ×</button>
        </div>
        {job.payload?.prompt && <p className="lightbox-prompt">{job.payload.prompt}</p>}
      </div>
    </div>
  );
}

export default function Gallery({ studio, onReuse, onUseAsInput }) {
  const jobs = useJobs();
  const [scope, setScope] = useState('studio');
  const [open, setOpen] = useState(null);
  const shown = useMemo(() => (scope === 'all' ? jobs : jobs.filter((j) => j.studio === studio)), [jobs, scope, studio]);
  const active = jobs.some((j) => !TERMINAL.has(j.status) && j.status !== 'error');
  const now = useNow(active);
  const running = jobs.filter((j) => !TERMINAL.has(j.status) && j.status !== 'error').length;

  return (
    <section className="gallery" aria-label="Resultados">
      <header className="gallery-head">
        <h2>Hoja de contactos</h2>
        <span className="mono dim">{running ? `${running} en proceso` : `${shown.length} tomas`}</span>
        <div className="gallery-tools">
          <div className="seg">
            <button type="button" className={scope === 'studio' ? 'on' : ''} onClick={() => setScope('studio')}>Este estudio</button>
            <button type="button" className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>Todo</button>
          </div>
          {jobs.some((j) => TERMINAL.has(j.status) || j.status === 'error') && (
            <button type="button" className="link-btn mono" onClick={() => window.confirm('¿Vaciar del historial todas las tomas terminadas? Los archivos siguen en Higgsfield.') && clearFinished()}>limpiar</button>
          )}
        </div>
      </header>

      {shown.length === 0 ? (
        <div className="empty">
          <div className="empty-frame" aria-hidden><span /><span /><span /></div>
          <p className="empty-title">La película está virgen.</p>
          <p className="dim">Escribe un prompt y pulsa <b>Revelar</b>. Tus tomas aparecerán aquí y se guardan en este navegador.</p>
        </div>
      ) : (
        <div className="contact-sheet">
          {shown.map((job, i) => (
            <Frame key={job.localId} job={job} index={shown.length - 1 - i} now={now}
              onReuse={onReuse} onUseAsInput={onUseAsInput} onOpen={(j, k) => setOpen({ job: j, index: k })} />
          ))}
        </div>
      )}
      {open && <Portal><Lightbox job={open.job} index={open.index} onClose={() => setOpen(null)} /></Portal>}
    </section>
  );
}

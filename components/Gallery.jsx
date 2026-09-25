'use client';
import { useEffect, useMemo, useState } from 'react';
import { archiveJob, cancelJob, clearFinished, removeJob, toggleFavorite, useJobs, withArchive } from '@/lib/jobs';
import { useAuth } from '@/lib/auth';
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

function Frame({ job, index, now, onReuse, onUseAsInput, onOpen, loggedIn }) {
  const done = TERMINAL.has(job.status) || job.status === 'error';
  const ok = job.status === 'completed';
  const [cancelError, setCancelError] = useState(null);
  const [saving, setSaving] = useState(false);
  const expired = ok && !job.saved && now - job.createdAt > WEEK;
  async function save() {
    setSaving(true);
    setCancelError(null);
    try { await archiveJob(job.localId); } catch (e) { setCancelError(friendlyError(e)); } finally { setSaving(false); }
  }
  const ratio = job.payload?.aspect_ratio && /^\d+:\d+$/.test(job.payload.aspect_ratio) ? job.payload.aspect_ratio.replace(':', ' / ') : job.output === 'video' ? '16 / 9' : '1 / 1';
  return (
    <article className={`frame status-${job.status}`} style={{ '--i': index }}>
      <div className="frame-edge mono">
        <span>{String(index + 1).padStart(3, '0')}</span>
        <span className="frame-status">{statusLabel(job.status)}</span>
        {!done && <span>{elapsed(now - job.createdAt)}</span>}
        <button type="button" className={`fav ${job.favorite ? 'on' : ''}`} onClick={() => toggleFavorite(job.localId)}
          aria-pressed={job.favorite} aria-label={job.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}>{job.favorite ? '★' : '☆'}</button>
      </div>

      <div className={`frame-media ${job.outputs.length > 1 ? 'multi' : ''}`} style={{ aspectRatio: job.outputs.length > 1 ? undefined : ratio }}>
        {ok && job.outputs.map((o, i) => <Media key={o.url + i} output={o} onOpen={() => onOpen(job, i)} />)}
        {!done && <div className="developing"><i /><span className="mono">{job.status === 'local_queue' ? 'esperando turno' : 'generando'}</span></div>}
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
        {(job.label || job.estimate || job.then || job.saved) && (
          <div className="frame-tags">
            {job.label && <span className="ftag">{job.label}</span>}
            {job.then && <span className="ftag ftag-flow">{job.chainedTo ? 'Animación lanzada' : 'Se animará al terminar'}</span>}
            {job.saved && <span className="ftag ftag-saved">☁ En tu nube</span>}
            {job.estimate && <span className="ftag ftag-cost">≈ {Number(job.estimate.credits).toFixed(2)} cr</span>}
          </div>
        )}
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
          {ok && loggedIn && !job.saved && (
            <button type="button" onClick={save} disabled={saving} title="Los archivos de Higgsfield caducan a los 7 días">{saving ? 'Guardando…' : '☁ Guardar'}</button>
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
  const rawJobs = useJobs();
  const jobs = useMemo(() => rawJobs.map(withArchive), [rawJobs]);
  const { session } = useAuth();
  const [scope, setScope] = useState('studio');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => (scope === 'all' || (scope === 'fav' ? j.favorite : j.studio === studio))
      && (!q || `${j.payload?.prompt || ''} ${j.family}`.toLowerCase().includes(q)));
  }, [jobs, scope, studio, query]);
  const active = jobs.some((j) => !TERMINAL.has(j.status) && j.status !== 'error');
  const now = useNow(active);
  const running = jobs.filter((j) => !TERMINAL.has(j.status) && j.status !== 'error').length;

  const [view, setView] = useState(null);
  // Sin historial se muestra «Cómo funciona»; con historial, los resultados.
  const tab = view || (jobs.some((j) => j.studio === studio) ? 'history' : 'how');

  return (
    <section className="gallery stage-main" aria-label="Resultados">
      <header className="gallery-head">
        <nav className="view-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setView('history')}>
            <span aria-hidden>▤</span> Historial{running ? <i className="dot">{running}</i> : null}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'how'} className={tab === 'how' ? 'on' : ''} onClick={() => setView('how')}>
            <span aria-hidden>◈</span> Cómo funciona
          </button>
        </nav>
        {tab === 'history' && (
          <div className="gallery-tools">
            {jobs.length > 3 && <input type="search" className="gallery-search" placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en el historial" />}
            <div className="seg" aria-label="Filtros">
              <button type="button" className={scope === 'studio' ? 'on' : ''} onClick={() => setScope('studio')}>Este estudio</button>
              <button type="button" className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>Todo</button>
              <button type="button" className={scope === 'fav' ? 'on' : ''} onClick={() => setScope('fav')}>★</button>
            </div>
            {jobs.some((j) => TERMINAL.has(j.status) || j.status === 'error') && (
              <button type="button" className="pill-btn" onClick={() => window.confirm('¿Quitar del historial los resultados terminados? Los favoritos se conservan.') && clearFinished()}>Limpiar</button>
            )}
          </div>
        )}
      </header>

      {tab === 'how' ? (
        <HowItWorks studio={studio} />
      ) : shown.length === 0 ? (
        <div className="empty">
          <img className="empty-avatar" src="/edavi-avatar.png" alt="" width="120" height="120" />
          <p className="empty-title">Aún no hay nada aquí</p>
          <p className="dim">{query ? 'Nada coincide con tu búsqueda.' : 'Escribe un prompt y pulsa Generar. Tus resultados aparecerán aquí.'}</p>
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

const HOW = {
  image: {
    title: 'Convierte ideas en imágenes',
    sub: 'Retratos, producto y carteles con los mejores modelos de imagen.',
    steps: [
      ['Elige un modelo', 'SOUL para retratos y moda, Recraft para gráficos, Marketing Studio para producto.', 'how-a'],
      ['Describe o sube referencias', 'Escribe tu idea o sube imágenes para editarlas y combinarlas.', 'how-b'],
      ['Genera y compara', 'Hasta 4 variaciones y el mismo prompt en varios modelos a la vez.', 'how-c'],
    ],
  },
  video: {
    title: 'Convierte texto en video',
    sub: 'Clips cinematográficos con audio nativo, listos para tus proyectos.',
    steps: [
      ['Escribe o anima', 'Parte de un prompt, de una imagen o de varias referencias.', 'how-b'],
      ['Dirige la toma', 'Formato, duración, resolución, cámara y audio, según el modelo.', 'how-c'],
      ['Genera y guarda', 'Mira el costo antes de generar y guarda los mejores en tu nube.', 'how-a'],
    ],
  },
  transform: {
    title: 'Transforma cualquier video',
    sub: 'Edita, extiende o copia el movimiento de un video a tu imagen.',
    steps: [
      ['Sube tu video', 'MP4 de al menos 4 segundos para transferir movimiento.', 'how-c'],
      ['Añade el cambio', 'Una imagen de personaje, un objeto nuevo o un prompt de edición.', 'how-a'],
      ['Genera', 'El movimiento original se conserva con el nuevo aspecto.', 'how-b'],
    ],
  },
};

function HowItWorks({ studio }) {
  const how = HOW[studio] || HOW.image;
  return (
    <div className="how">
      <h2>{how.title}</h2>
      <p className="how-sub">{how.sub}</p>
      <div className="how-steps">
        {how.steps.map(([title, text, art], i) => (
          <article key={title} className="how-card">
            <span className="how-n mono">{String(i + 1).padStart(2, '0')}</span>
            <h3>{title}</h3>
            <p>{text}</p>
            <div className={`how-art ${art}`} aria-hidden />
          </article>
        ))}
      </div>
    </div>
  );
}

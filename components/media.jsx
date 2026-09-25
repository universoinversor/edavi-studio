'use client';
// Piezas multimedia compartidas por la galería de cada estudio y la biblioteca.
import { useState } from 'react';
import { workflowLabel } from '@/lib/catalog';
import { COPY } from '@/lib/copy';
import { useDialog } from '@/lib/useDialog';
import Icon from './Icon';

const t = COPY.gallery;

export async function download(url, name) {
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

export function extFor(output, url) {
  const m = url.split('?')[0].match(/\.(\w{3,4})$/);
  if (m) return m[1];
  return output.type === 'video' ? 'mp4' : output.type === 'audio' ? 'wav' : 'png';
}

export const fileName = (job, output, i) => `edavi-${job.requestId?.slice(0, 8) || job.localId}-${i + 1}.${extFor(output, output.url)}`;

export function downloadJob(job) {
  job.outputs.forEach((o, i) => setTimeout(() => download(o.url, fileName(job, o, i)), i * 350));
}

export function Media({ output, onOpen, alt = '' }) {
  if (output.type === 'video') {
    return (
      <video src={output.url} muted loop playsInline preload="metadata" aria-label={alt}
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => e.currentTarget.pause()} onClick={onOpen} />
    );
  }
  if (output.type === 'audio') return <audio src={output.url} controls />;
  return <img src={output.url} alt={alt} loading="lazy" decoding="async" onClick={onOpen} />;
}

export function Lightbox({ job, index, onClose }) {
  const [i, setI] = useState(index);
  const ref = useDialog(onClose);
  const o = job.outputs[i];
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, job.outputs.length - 1));
    if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
  };
  return (
    <div className="lightbox" onClick={onClose}>
      <div ref={ref} className="lightbox-inner" role="dialog" aria-modal="true" aria-label={t.zoom} onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        {o.type === 'video' ? <video src={o.url} controls autoPlay loop playsInline /> : <img src={o.url} alt={job.payload?.prompt || ''} />}
        <div className="lightbox-bar mono">
          <span>{job.family} · {workflowLabel(job.workflow)}</span>
          {job.outputs.length > 1 && <span aria-live="polite">{i + 1}/{job.outputs.length}</span>}
          <a href={o.url} target="_blank" rel="noreferrer">{t.openOriginal}</a>
          <button type="button" onClick={() => download(o.url, fileName(job, o, i))}><Icon name="download" size={14} /> {t.download}</button>
          <button type="button" onClick={onClose}>{t.closeZoom}</button>
        </div>
        {job.payload?.prompt && <p className="lightbox-prompt">{job.payload.prompt}</p>}
      </div>
    </div>
  );
}

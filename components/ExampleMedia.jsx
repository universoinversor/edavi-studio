'use client';
import { useEffect, useRef, useState } from 'react';
import { COPY } from '@/lib/copy';

// ¿Se puede reproducir video decorativo? No con «reducir movimiento» ni «ahorro de datos».
function motionAllowed() {
  if (typeof window === 'undefined') return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = /** @type {any} */ (navigator).connection?.saveData;
  return !reduce && !saveData;
}

/**
 * Portada de ejemplo de un modelo: siempre muestra la miniatura (ligera) y solo
 * descarga el video cuando se pide (`playing`, p. ej. al pasar el ratón) o, con
 * `autoPlay`, cuando está en pantalla en un dispositivo con ratón.
 * @param {{ example: { type: 'video'|'image', src: string, poster?: string } | null, playing?: boolean, autoPlay?: boolean, credit?: boolean, className?: string }} props
 */
export default function ExampleMedia({ example, playing = false, autoPlay = false, credit = true, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(motionAllowed() && (!autoPlay || window.matchMedia('(pointer: fine)').matches));
  }, [autoPlay]);

  useEffect(() => {
    if (!autoPlay || !ref.current || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [autoPlay]);

  if (!example) return null;
  const wantsVideo = example.type === 'video' && allowed && (playing || (autoPlay && visible));

  return (
    <span ref={ref} className={`ex-media ${ready && wantsVideo ? 'is-playing' : ''} ${className}`} aria-hidden>
      {example.poster && <img src={example.poster} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />}
      {wantsVideo && (
        <video src={example.src} muted loop playsInline autoPlay preload="auto" onPlaying={() => setReady(true)} />
      )}
      {credit && <span className="ex-credit">{COPY.examples.credit}</span>}
    </span>
  );
}

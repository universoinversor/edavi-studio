'use client';
// Estado de ánimo global de la mascota, derivado de lo que pasa en la app:
//   offline  → sin conexión
//   thinking → hay generaciones en curso
//   success  → acaba de terminar una (unos segundos)
//   error    → acaba de fallar una (unos segundos)
//   idle     → reposo
import { useEffect, useState } from 'react';
import { useJobs } from './jobs';
import { TERMINAL } from './schema';

const FLASH_MS = 4000;

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

export function useMascotMood() {
  const jobs = useJobs();
  const online = useOnline();
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    let timer;
    const onFinished = (e) => {
      const status = e.detail?.status;
      if (status === 'canceled') return;
      setFlash(status === 'completed' ? 'success' : 'error');
      clearTimeout(timer);
      timer = setTimeout(() => setFlash(null), FLASH_MS);
    };
    window.addEventListener('edavi:job-finished', onFinished);
    return () => { window.removeEventListener('edavi:job-finished', onFinished); clearTimeout(timer); };
  }, []);

  const running = jobs.some((j) => !TERMINAL.has(j.status) && j.status !== 'error');
  if (!online) return 'offline';
  if (flash) return flash;
  if (running) return 'thinking';
  return 'idle';
}

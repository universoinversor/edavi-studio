'use client';
import { useEffect, useMemo, useState } from 'react';
import { useJobs, withArchive } from '@/lib/jobs';
import { useAuth } from '@/lib/auth';
import { TERMINAL } from '@/lib/schema';
import { useMascotMood } from '@/lib/mascot';
import { COPY } from '@/lib/copy';
import Avatar from './Avatar';
import Icon from './Icon';

const t = COPY.dashboard;
const DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

function displayName(session) {
  const meta = session?.user?.user_metadata || {};
  const raw = meta.full_name || meta.name || session?.user?.email?.split('@')[0] || '';
  return raw ? raw.split(/[\s._-]/)[0] : t.guest;
}

// Cabecera del panel: saludo y métricas de actividad (estilo consola).
export default function Dashboard({ onOpen }) {
  const jobs = useJobs();
  const { session } = useAuth();
  const mood = useMascotMood();
  const [hour, setHour] = useState(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const stats = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = jobs.filter((j) => j.createdAt >= start.getTime());
    const done = jobs.filter((j) => j.status === 'completed');
    const days = Array.from({ length: DAYS }, (_, i) => {
      const from = start.getTime() - (DAYS - 1 - i) * DAY;
      const d = new Date(from);
      return { label: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }), n: jobs.filter((j) => j.createdAt >= from && j.createdAt < from + DAY).length };
    });
    return {
      today: today.length,
      spent: today.filter((j) => j.status === 'completed').reduce((s, j) => s + Number(j.estimate?.credits || 0), 0),
      running: jobs.filter((j) => !TERMINAL.has(j.status) && j.status !== 'error').length,
      total: done.map(withArchive).reduce((n, j) => n + (j.outputs?.length || 0), 0),
      days,
      max: Math.max(1, ...days.map((d) => d.n)),
    };
  }, [jobs]);

  return (
    <section className="dash" aria-labelledby="dash-title">
      <div className="dash-head">
        <h1 id="dash-title" className="dash-greet">
          <span>{hour === null ? ' ' : `${t.greeting(hour)},`}</span>
          <span className="dash-name"><Avatar size="xs" mood={mood} /> {displayName(session)}</span>
        </h1>
        <div className="dash-actions">
          <button type="button" className="pill-btn" onClick={() => onOpen('models')}><Icon name="layers" size={16} /> {t.models}</button>
          <button type="button" className="pill-btn" onClick={() => onOpen('library')}><Icon name="grid" size={16} /> {t.library}</button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="stat stat-accent">
          <b>{stats.today}</b><span>{t.stats.today}</span>
        </div>
        <div className="stat">
          <b>{stats.spent.toFixed(1)}</b><span>{t.stats.spent}</span>
        </div>
        <div className="stat">
          <b>{stats.running}</b><span>{t.stats.running}</span>
          {stats.running > 0 && <i className="stat-pulse" aria-hidden />}
        </div>
        <div className="stat stat-chart">
          <b>{stats.total}</b><span>{t.stats.total}</span>
          <ol className="bars" aria-label={t.chart(DAYS)}>
            {stats.days.map((d) => (
              <li key={d.label} style={/** @type {any} */ ({ '--v': d.n / stats.max })} title={t.chartDay(d.label, d.n)}>
                <span className="sr-only">{t.chartDay(d.label, d.n)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

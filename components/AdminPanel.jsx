'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from '@/lib/providers';
import { useJobs, withArchive, setPublishedLocal } from '@/lib/jobs';
import { COPY } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { useRole } from '@/lib/role';
import Avatar from './Avatar';
import Icon from './Icon';

const t = COPY.admin;
const CREDENTIALS = /^[^:\s]+:[^:\s]+$/;

function KeyCard({ serverCredentials }) {
  const [status, setStatus] = useState(null);
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => storage.providerKeyStatus().then(setStatus), []);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    if (!CREDENTIALS.test(value.trim())) { setError(t.key.invalid); return; }
    setBusy(true); setError(null);
    const r = await storage.saveProviderKey(value.trim());
    setBusy(false);
    if (!r.ok) { setError(r.invalid ? t.key.invalid : t.key.error); return; }
    setValue('');
    toast(t.key.saved, { tone: 'success' });
    load();
  }

  async function remove() {
    setBusy(true);
    const r = await storage.saveProviderKey('');
    setBusy(false);
    if (r.ok) { toast(t.key.removed); load(); } else toast(t.key.error, { tone: 'error' });
  }

  const date = status?.updated_at ? new Date(status.updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <section className="admin-card" aria-labelledby="admin-key">
      <header>
        <h2 id="admin-key"><Icon name="bolt" size={18} /> {t.key.title}</h2>
        <p className="dim">{t.key.lead}</p>
      </header>
      <p className={`admin-status ${status?.configured ? 'ok' : ''}`} role="status">
        <Icon name={status?.configured ? 'check' : 'alert'} size={16} />
        {status?.configured ? t.key.configured(status.hint, date) : t.key.notConfigured}
      </p>
      {serverCredentials && <p className="hint">{t.key.env}</p>}
      <form className="admin-key-form" onSubmit={save} noValidate>
        <div className="field">
          <div className="field-label">
            <label htmlFor="admin-key-input">{t.key.label}</label>
            <button type="button" className="link-btn mono" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? t.key.hide : t.key.show}</button>
          </div>
          <input id="admin-key-input" type={show ? 'text' : 'password'} value={value} autoComplete="off" spellCheck={false}
            placeholder="KEY_ID:KEY_SECRET" onChange={(e) => setValue(e.target.value)} aria-invalid={Boolean(error)} aria-describedby="admin-key-hint" />
          <span className="hint" id="admin-key-hint">{t.key.where}</span>
          {error && <span className="field-error" role="alert">{error}</span>}
        </div>
        <div className="admin-actions">
          {status?.configured && <button type="button" className="ghost-btn" onClick={remove} disabled={busy}>{t.key.remove}</button>}
          <button type="submit" className="generate small" disabled={busy || !value}>{busy ? t.key.saving : t.key.save}</button>
        </div>
      </form>
    </section>
  );
}

function Requests() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('pending');
  const load = useCallback(() => storage.listSignupRequests().then(setRows), []);
  useEffect(() => { load(); }, [load]);

  async function review(id, status) {
    if (await storage.reviewSignupRequest(id, status)) { toast(t.requests.updated, { tone: 'success' }); load(); }
  }

  const list = (rows || []).filter((r) => filter === 'all' || r.status === 'pending');
  const pending = (rows || []).filter((r) => r.status === 'pending').length;
  return (
    <section className="admin-card" aria-labelledby="admin-req">
      <header className="admin-card-head">
        <div>
          <h2 id="admin-req"><Icon name="user" size={18} /> {t.requests.title} {pending > 0 && <i className="dot">{pending}</i>}</h2>
          <p className="dim">{t.requests.lead}</p>
        </div>
        <button type="button" className="pill-btn" onClick={load}><Icon name="refresh" size={16} /> {t.refresh}</button>
      </header>
      <div className="filters" role="group" aria-label={t.requests.title}>
        {Object.entries(t.requests.filters).map(([id, label]) => (
          <button type="button" key={id} className={filter === id ? 'on' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {rows && !list.length ? <p className="dim">{t.requests.empty}</p> : (
        <ul className="admin-list">
          {list.map((r) => (
            <li key={r.id}>
              <div className="admin-row-main">
                <b>{r.name || r.email}</b>
                <span className="dim">{r.email} · {new Date(r.created_at).toLocaleDateString('es')}</span>
                {r.message && <p>{r.message}</p>}
              </div>
              <span className={`chip-status s-${r.status}`}>{t.requests.status[r.status]}</span>
              {r.status !== 'approved' && <button type="button" className="pill-btn" onClick={() => review(r.id, 'approved')}><Icon name="check" size={16} /> {t.requests.approve}</button>}
              {r.status !== 'rejected' && <button type="button" className="ghost-btn" onClick={() => review(r.id, 'rejected')}>{t.requests.reject}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Showcase() {
  const jobs = useJobs();
  const done = useMemo(() => jobs.map(withArchive).filter((j) => j.status === 'completed' && j.outputs?.length), [jobs]);

  async function toggle(job) {
    const next = job.published === false;
    setPublishedLocal(job.localId, next);
    if (!(await storage.setPublished(job.localId, next))) {
      setPublishedLocal(job.localId, !next);
      toast(t.showcase.error, { tone: 'error' });
    }
  }

  return (
    <section className="admin-card" aria-labelledby="admin-show">
      <header>
        <h2 id="admin-show"><Icon name="grid" size={18} /> {t.showcase.title}</h2>
        <p className="dim">{t.showcase.lead}</p>
      </header>
      {!done.length ? <p className="dim">{t.showcase.empty}</p> : (
        <ul className="admin-grid">
          {done.slice(0, 60).map((j) => {
            const out = j.outputs[0];
            const hidden = j.published === false;
            return (
              <li key={j.localId} className={hidden ? 'is-hidden' : ''}>
                {out.type === 'video' ? <video src={out.url} muted playsInline preload="metadata" /> : <img src={out.url} alt={j.payload?.prompt || j.family} loading="lazy" />}
                <span className="admin-grid-meta">
                  <span className={`chip-status ${hidden ? 's-rejected' : 's-approved'}`}>{hidden ? t.showcase.hidden : t.showcase.public}</span>
                  <button type="button" className="pill-btn" onClick={() => toggle(j)} aria-pressed={!hidden}>
                    <Icon name={hidden ? 'eye' : 'eyeOff'} size={15} /> {hidden ? t.showcase.show : t.showcase.hide}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function AdminPanel({ health }) {
  const { isAdmin, ready } = useRole();
  if (!ready) return null;
  if (!isAdmin) {
    return <div className="state-screen"><Avatar size="md" mood="error" /><p>{t.denied}</p></div>;
  }
  return (
    <div className="admin-page">
      <header className="lib-head">
        <div>
          <h1>{t.title}</h1>
          <p className="dim">{t.lead}</p>
        </div>
      </header>
      <div className="admin-cols">
        <KeyCard serverCredentials={Boolean(health?.serverCredentials)} />
        <Requests />
      </div>
      <Showcase />
    </div>
  );
}

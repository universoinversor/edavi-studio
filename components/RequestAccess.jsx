'use client';
import { useState } from 'react';
import { storage } from '@/lib/providers';
import { COPY } from '@/lib/copy';
import { useDialog } from '@/lib/useDialog';
import Avatar from './Avatar';
import Icon from './Icon';
import Portal from './Portal';

const t = COPY.access.request;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Formulario público para pedir acceso a EDAVI (lo revisa la administración).
export default function RequestAccess({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const ref = useDialog(onClose);

  async function submit(e) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) { setError(t.invalidEmail); return; }
    setBusy(true);
    setError(null);
    const result = await storage.requestSignup({ email, name, message });
    setBusy(false);
    if (result === 'sent') setDone(t.sent);
    else if (result === 'duplicate') setDone(t.duplicate);
    else setError(t.error);
  }

  return (
    <Portal>
      <div className="sheet-backdrop" onClick={onClose}>
        <form ref={ref} className="sheet settings auth" role="dialog" aria-modal="true" aria-labelledby="request-title"
          onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
          <Avatar size="sm" mood={error ? 'error' : done ? 'success' : 'idle'} className="auth-avatar" />
          <header className="sheet-head">
            <h2 id="request-title">{t.title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}><Icon name="x" /></button>
          </header>
          <p className="dim auth-lead">{t.lead}</p>
          {done ? (
            <p className="notice" role="status">{done}</p>
          ) : (
            <>
              <div className="field">
                <div className="field-label"><label htmlFor="req-name">{t.name}</label></div>
                <input id="req-name" autoComplete="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} data-autofocus />
              </div>
              <div className="field">
                <div className="field-label"><label htmlFor="req-email">{t.email}</label></div>
                <input id="req-email" type="email" autoComplete="email" value={email} maxLength={254} required
                  onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'req-error' : undefined} />
              </div>
              <div className="field">
                <div className="field-label"><label htmlFor="req-message">{t.message}</label></div>
                <textarea id="req-message" rows={3} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {error && <p className="field-error" id="req-error" role="alert">{error}</p>}
              <button type="submit" className="cta auth-submit" disabled={busy || !email}>{busy ? t.busy : t.submit}</button>
            </>
          )}
        </form>
      </div>
    </Portal>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/lib/auth';
import { COPY } from '@/lib/copy';
import Icon from './Icon';

const t = COPY.account;

// Menú de la cuenta (botón con la inicial). Se cierra con Esc o al pulsar fuera.
export default function AccountMenu({ email, onLibrary, onOnboarding, onSettings }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const button = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    wrap.current?.querySelector('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <div className="account" ref={wrap}>
      <button ref={button} type="button" className="user-pill" onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label={`${t.menu}: ${email}`}>
        {(email || '?')[0].toUpperCase()}
      </button>
      {open && (
        <div className="account-menu" role="menu" aria-label={t.menu}>
          <p className="account-who"><span className="dim">{t.signedInAs}</span><b>{email}</b></p>
          <button type="button" role="menuitem" onClick={run(onLibrary)}><Icon name="grid" /> {t.library}</button>
          <button type="button" role="menuitem" onClick={run(onOnboarding)}><Icon name="sparkles" /> {t.replayOnboarding}</button>
          <button type="button" role="menuitem" onClick={run(onSettings)}><Icon name="settings" /> {COPY.app.settings}</button>
          <hr />
          <button type="button" role="menuitem" className="danger" onClick={run(signOut)}><Icon name="logout" /> {t.signOut}</button>
        </div>
      )}
    </div>
  );
}

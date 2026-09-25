'use client';
import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { useDialog } from '@/lib/useDialog';
import Icon from './Icon';
import Portal from './Portal';

const t = COPY.settings;
const CREDENTIALS = /^[^:\s]+:[^:\s]+$/;

export default function SettingsModal({ health, reason, onClose }) {
  const [credentials, setCredentials] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const ref = useDialog(onClose);

  useEffect(() => {
    const s = loadSettings();
    setCredentials(s.credentials || '');
    setPassword(s.password || '');
  }, []);

  const validFormat = !credentials || CREDENTIALS.test(credentials.trim());

  function save(e) {
    e.preventDefault();
    if (!validFormat) return;
    saveSettings({ credentials: credentials.trim() || undefined, password: password || undefined });
    toast(t.saved, { tone: 'success', duration: 2500 });
    onClose();
  }

  return (
    <Portal>
      <div className="sheet-backdrop" onClick={onClose}>
        <form ref={ref} className="sheet settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()} onSubmit={save}>
          <header className="sheet-head">
            <h2 id="settings-title">{t.title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}><Icon name="x" /></button>
          </header>

          {reason && <p className="notice" role="alert">{reason}</p>}

          <dl className="status-list mono">
            <div><dt>{t.mode}</dt><dd>{health?.mock ? t.modeDemo : t.modeReal}</dd></div>
            <div><dt>{t.serverKeys}</dt><dd>{health?.serverCredentials ? t.configured : t.notConfigured}</dd></div>
          </dl>

          {health?.passwordRequired && (
            <div className="field">
              <div className="field-label"><label htmlFor="studio-password">{t.studioPassword}</label></div>
              <input id="studio-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-describedby="studio-password-hint" />
              <span className="hint" id="studio-password-hint">{t.studioPasswordHint}</span>
            </div>
          )}

          <div className="field">
            <div className="field-label">
              <label htmlFor="own-key">{t.ownKey(health?.serverCredentials)}</label>
              <button type="button" className="link-btn mono" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? t.hide : t.show}</button>
            </div>
            <input id="own-key" type={show ? 'text' : 'password'} value={credentials} placeholder="KEY_ID:KEY_SECRET" autoComplete="off" spellCheck={false}
              onChange={(e) => setCredentials(e.target.value)} aria-invalid={!validFormat} aria-describedby="own-key-hint" />
            {!validFormat && <span className="field-error" role="alert">{t.keyFormat}</span>}
            <span className="hint" id="own-key-hint">
              {t.keyHint[0]} <a href="https://console.higgsfield.ai" target="_blank" rel="noreferrer">console.higgsfield.ai</a>. {t.keyHint[1]}
            </span>
          </div>

          <footer className="sheet-foot">
            <button type="button" className="ghost-btn" onClick={() => { setCredentials(''); setPassword(''); }}>{t.clear}</button>
            <button type="submit" className="generate small" disabled={!validFormat}>{t.save}</button>
          </footer>
        </form>
      </div>
    </Portal>
  );
}

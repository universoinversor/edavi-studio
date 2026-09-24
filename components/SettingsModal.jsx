'use client';
import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '@/lib/client';

export default function SettingsModal({ health, reason, onClose }) {
  const [credentials, setCredentials] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setCredentials(s.credentials || '');
    setPassword(s.password || '');
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validFormat = !credentials || /^[^:\s]+:[^:\s]+$/.test(credentials.trim());

  function save(e) {
    e.preventDefault();
    if (!validFormat) return;
    saveSettings({ credentials: credentials.trim() || undefined, password: password || undefined });
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet settings" role="dialog" aria-label="Ajustes" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <header className="sheet-head">
          <h2>Ajustes</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        {reason && <p className="notice">{reason}</p>}

        <dl className="status-list mono">
          <div><dt>Modo</dt><dd>{health?.mock ? 'Demostración (sin gastar créditos)' : 'Higgsfield real'}</dd></div>
          <div><dt>Credenciales del servidor</dt><dd>{health?.serverCredentials ? 'Configuradas' : 'No configuradas'}</dd></div>
        </dl>

        {health?.passwordRequired && (
          <label className="field">
            <div className="field-label"><span>Contraseña del estudio</span></div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <span className="hint">Protege los créditos de la cuenta configurada en el servidor.</span>
          </label>
        )}

        <label className="field">
          <div className="field-label">
            <span>Tu clave de Higgsfield {health?.serverCredentials ? '(opcional)' : ''}</span>
            <button type="button" className="link-btn mono" onClick={() => setShow((s) => !s)}>{show ? 'ocultar' : 'mostrar'}</button>
          </div>
          <input type={show ? 'text' : 'password'} value={credentials} placeholder="KEY_ID:KEY_SECRET" autoComplete="off" spellCheck={false}
            onChange={(e) => setCredentials(e.target.value)} />
          {!validFormat && <span className="field-error">Formato: KEY_ID:KEY_SECRET (separados por dos puntos).</span>}
          <span className="hint">
            Créala en <a href="https://console.higgsfield.ai" target="_blank" rel="noreferrer">console.higgsfield.ai</a>.
            Se guarda solo en este navegador y viaja a tu propio servidor, que la reenvía a Higgsfield. Si la dejas vacía se usan las credenciales del servidor.
          </span>
        </label>

        <footer className="sheet-foot">
          <button type="button" className="ghost-btn" onClick={() => { setCredentials(''); setPassword(''); }}>Borrar</button>
          <button type="submit" className="generate small" disabled={!validFormat}><span>Guardar</span></button>
        </footer>
      </form>
    </div>
  );
}

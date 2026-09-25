'use client';
import { useEffect, useState } from 'react';
import { signIn } from '@/lib/auth';
import { BRAND } from '@/lib/brand';
import Icon from './Icon';

export default function LoginModal({ reason, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet settings login" role="dialog" aria-label="Iniciar sesión" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <img className="login-avatar" src="/edavi-avatar.png" alt="" width="96" height="96" />
        <header className="sheet-head">
          <h2>Entrar</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <p className="dim login-lead">{reason || `Inicia sesión para generar y guardar tu historial en la nube de ${BRAND.name}.`}</p>
        <label className="field">
          <div className="field-label"><span>Email</span></div>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <div className="field-label"><span>Contraseña</span></div>
          <div className="password-wrap">
            <input type={showPass ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="password-eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <Icon name={showPass ? 'eyeOff' : 'eye'} />
            </button>
          </div>
        </label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <footer className="sheet-foot">
          <button type="submit" className="cta" disabled={busy || !email || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </footer>
      </form>
    </div>
  );
}

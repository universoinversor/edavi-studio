'use client';
import { useState } from 'react';
import { requestPasswordReset, signIn, signUp, updatePassword } from '@/lib/auth';
import { COPY } from '@/lib/copy';
import { storage } from '@/lib/providers';
import { requestAccess } from '@/lib/role';
import { toast } from '@/lib/toast';
import { useDialog } from '@/lib/useDialog';
import Avatar from './Avatar';
import Icon from './Icon';
import Portal from './Portal';

const t = COPY.auth;

function PasswordInput({ value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required minLength={autoComplete === 'new-password' ? 8 : undefined} />
      <button type="button" className="password-eye" onClick={() => setShow((v) => !v)} aria-label={show ? t.hidePassword : t.showPassword} aria-pressed={show}>
        <Icon name={show ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}

// Modal de acceso con cuatro modos: entrar, crear cuenta, recuperar y nueva contraseña.
export default function AuthModal({ mode: initialMode = 'signin', reason, allowSignup = false, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const ref = useDialog(onClose);

  function switchMode(next) {
    setMode(next);
    setError(null);
    setDone(null);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        onClose();
      } else if (mode === 'signup') {
        // Sin registro abierto, solo pueden crear cuenta los emails con solicitud aprobada.
        if (!allowSignup && !(await storage.signupAllowed(email.trim()))) { setError(COPY.access.notApproved); return; }
        const active = await signUp(email.trim(), password);
        if (active) { toast(t.done.welcome, { tone: 'success' }); onClose(); } else setDone(t.done.signup);
      } else if (mode === 'reset') {
        await requestPasswordReset(email.trim());
        setDone(t.done.reset);
      } else if (mode === 'recovery') {
        await updatePassword(password);
        toast(t.done.recovery, { tone: 'success' });
        onClose();
      }
    } catch (err) {
      setError(err.message || t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const needsEmail = mode !== 'recovery';
  const needsPassword = mode !== 'reset';
  const canSubmit = (!needsEmail || email) && (!needsPassword || password);

  return (
    <Portal>
      <div className="sheet-backdrop" onClick={onClose}>
        <form ref={ref} className="sheet settings auth" role="dialog" aria-modal="true" aria-labelledby="auth-title"
          onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
          <Avatar size="sm" mood={error ? 'error' : done ? 'success' : 'idle'} className="auth-avatar" />
          <header className="sheet-head">
            <h2 id="auth-title">{t.titles[mode]}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}><Icon name="x" /></button>
          </header>
          <p className="dim auth-lead">{mode === 'signin' && reason ? reason : t.lead[mode]}</p>

          {done ? (
            <p className="notice" role="status">{done}</p>
          ) : (
            <>
              {needsEmail && (
                <div className="field">
                  <div className="field-label"><label htmlFor="auth-email">{t.email}</label></div>
                  <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-autofocus />
                </div>
              )}
              {needsPassword && (
                <div className="field">
                  <div className="field-label">
                    <label htmlFor="auth-password">{mode === 'recovery' ? t.newPassword : t.password}</label>
                    {mode === 'signin' && <button type="button" className="link-btn mono" onClick={() => switchMode('reset')}>{t.toReset}</button>}
                  </div>
                  <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                  {mode !== 'signin' && <span className="hint">{t.passwordHint}</span>}
                </div>
              )}
              {error && <p className="field-error" role="alert">{error}</p>}
              <button type="submit" className="cta auth-submit" disabled={busy || !canSubmit}>{busy ? t.busy[mode] : t.submit[mode]}</button>
            </>
          )}

          <footer className="auth-switch">
            {mode === 'signin' && <button type="button" className="link-btn" onClick={() => switchMode('signup')}>{t.toSignup}</button>}
            {(mode === 'signin' || (mode === 'signup' && error)) && <button type="button" className="link-btn" onClick={requestAccess}>{COPY.access.requestLink}</button>}
            {mode === 'signup' && <button type="button" className="link-btn" onClick={() => switchMode('signin')}>{t.toSignin}</button>}
            {(mode === 'reset' || (done && mode === 'signup')) && <button type="button" className="link-btn" onClick={() => switchMode('signin')}>{t.back}</button>}
          </footer>
        </form>
      </div>
    </Portal>
  );
}

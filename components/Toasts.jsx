'use client';
import { dismiss, useToasts } from '@/lib/toast';
import { COPY } from '@/lib/copy';
import Icon from './Icon';

const TONE_ICON = { success: 'check', error: 'alert', info: 'sparkles' };

export default function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" role="region" aria-label={COPY.toasts.region} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
          <Icon name={TONE_ICON[t.tone] || 'sparkles'} size={18} />
          <span className="toast-msg">{t.message}</span>
          {t.action && (
            <button type="button" className="toast-action" onClick={() => { t.action.onClick(); dismiss(t.id); }}>{t.action.label}</button>
          )}
          <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label={COPY.toasts.dismiss}><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );
}

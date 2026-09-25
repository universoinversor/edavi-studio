'use client';
import { useState } from 'react';
import { COPY } from '@/lib/copy';
import { completeOnboarding } from '@/lib/onboarding';
import { setTheme, useTheme } from '@/lib/theme';
import { useDialog } from '@/lib/useDialog';
import Avatar from './Avatar';
import Icon from './Icon';
import Portal from './Portal';

const t = COPY.onboarding;
const CHOICE_ICON = { image: 'camera', video: 'video', prompts: 'sparkles' };

// Bienvenida en 3 pasos. Al terminar lleva al estudio elegido.
export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState('image');
  const theme = useTheme();
  const total = t.steps.length;
  const current = t.steps[step];

  function finish(destination) {
    completeOnboarding();
    onFinish(destination);
  }
  const ref = useDialog(() => finish(null));

  return (
    <Portal>
      <div className="sheet-backdrop onboarding-backdrop">
        <section ref={ref} className="sheet onboarding" role="dialog" aria-modal="true" aria-labelledby="ob-title" aria-describedby="ob-text">
          <header className="onboarding-top">
            <span className="mono dim">{t.step(step + 1, total)}</span>
            <button type="button" className="link-btn" onClick={() => finish(null)}>{t.skip}</button>
          </header>
          <div className="onboarding-progress" aria-hidden><i style={{ width: `${((step + 1) / total) * 100}%` }} /></div>

          <Avatar size="lg" mood={step === total - 1 ? 'success' : 'idle'} />
          <h2 id="ob-title">{current.title}</h2>
          <p id="ob-text" className="dim">{current.text}</p>

          {step === 1 && (
            <div className="ob-choices" role="radiogroup" aria-labelledby="ob-title">
              {current.choices.map((c) => (
                <button type="button" key={c.id} role="radio" aria-checked={choice === c.id}
                  className={`ob-choice ${choice === c.id ? 'on' : ''}`} onClick={() => setChoice(c.id)}>
                  <Icon name={CHOICE_ICON[c.id]} size={22} />
                  <b>{c.label}</b>
                  <em>{c.hint}</em>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="ob-choices ob-themes" role="radiogroup" aria-labelledby="ob-title">
              {[['dark', COPY.app.themeDark, 'moon'], ['light', COPY.app.themeLight, 'sun']].map(([id, label, icon]) => (
                <button type="button" key={id} role="radio" aria-checked={theme === id}
                  className={`ob-choice ob-theme-${id} ${theme === id ? 'on' : ''}`} onClick={() => setTheme(id)}>
                  <Icon name={icon} size={22} />
                  <b>{label}</b>
                </button>
              ))}
            </div>
          )}

          <footer className="onboarding-foot">
            {step > 0 ? <button type="button" className="pill-btn" onClick={() => setStep((s) => s - 1)}>{t.back}</button> : <span />}
            {step < total - 1
              ? <button type="button" className="cta" onClick={() => setStep((s) => s + 1)} data-autofocus>{t.next} <Icon name="arrowRight" size={16} /></button>
              : <button type="button" className="cta" onClick={() => finish(choice)}>{t.finish} <Icon name="sparkles" size={16} /></button>}
          </footer>
        </section>
      </div>
    </Portal>
  );
}

'use client';
import { useCallback, useState } from 'react';
import { forgetCharacter, getDefaultAvatarId, importCharacter, setDefaultAvatar, trainCharacter, useCharacters } from '@/lib/characters';
import { friendlyError } from '@/lib/errors';
import { COPY } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { MediaListField } from './fields';
import Avatar from './Avatar';
import Icon from './Icon';

const t = COPY.characters;
const RECOMMENDED = 10;

const imagesField = {
  key: 'input_images', label: t.photos, required: true, accept: 'image', kind: 'mediaList',
  prop: { type: 'array', maxItems: 100, minItems: 1 },
};

// Tu avatar (Soul ID): guía en 3 pasos, estados de entrenamiento y avatar principal.
export default function CharactersStudio({ onUse }) {
  const characters = useCharacters();
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v2');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [importId, setImportId] = useState('');
  const onBusy = useCallback((_k, b) => setUploading(b), []);
  const defaultId = getDefaultAvatarId();
  const step = !name.trim() ? 0 : images.length === 0 ? 1 : 2;
  const training = characters.some((c) => !['completed', 'failed'].includes(c.status));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t.errors.name);
    if (!images.length) return setError(t.errors.photos);
    setBusy(true);
    try {
      await trainCharacter({ name: name.trim().slice(0, 100), modelVersion: version, imageUrls: images });
      setName('');
      setImages([]);
      toast(t.training, { tone: 'info' });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    setError(null);
    try { await importCharacter(importId, '', version); setImportId(''); } catch (err) { setError(friendlyError(err)); }
  }

  function makeDefault(c) {
    const next = defaultId === c.id ? null : c.id;
    setDefaultAvatar(next);
    if (next) toast(t.defaultSet(c.name), { tone: 'success' });
  }

  return (
    <div className="characters">
      <form className="composer panel" onSubmit={submit} aria-labelledby="avatar-title">
        <header className="model-head">
          <div className="model-button static"><span className="mono dim">{t.kicker}</span><span className="model-name" id="avatar-title">{t.title}</span></div>
          <p className="model-desc">{t.lead}</p>
          <ol className="avatar-steps" aria-label={t.stepsLabel}>
            {t.steps.map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
                <span className="avatar-step-n">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{label}
              </li>
            ))}
          </ol>
        </header>
        <div className="panel-scroll">
          <div className="field-wrap">
            <div className="field">
              <div className="field-label"><label htmlFor="avatar-name">{t.name}<b className="req">*</b></label><span className="mono dim">{name.length}/100</span></div>
              <input id="avatar-name" type="text" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} />
            </div>
          </div>
          <div className="field-wrap">
            <div className="field">
              <div className="field-label"><span id="avatar-version">{t.version}</span></div>
              <div className="chips" role="radiogroup" aria-labelledby="avatar-version">
                {t.versions.map((v) => (
                  <button type="button" role="radio" aria-checked={version === v.id} key={v.id} className={`chip ${version === v.id ? 'on' : ''}`} onClick={() => setVersion(v.id)} title={v.hint}>{v.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="field-wrap">
            <MediaListField field={imagesField} value={images} onChange={(v) => setImages((prev) => (typeof v === 'function' ? v(prev) : v))} onBusy={onBusy} />
            <div className="photo-meter" role="progressbar" aria-valuemin={0} aria-valuemax={RECOMMENDED} aria-valuenow={Math.min(images.length, RECOMMENDED)} aria-label={t.photoMeter(images.length)}>
              <i style={{ width: `${Math.min(100, (images.length / RECOMMENDED) * 100)}%` }} />
            </div>
            <span className="hint">{t.photoMeter(images.length)} · {t.tip}</span>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <details className="row-card advanced">
            <summary><span className="adv-title"><Icon name="sliders" size={16} /> {t.import}</span><span className="row-chevron" aria-hidden>›</span></summary>
            <div className="advanced-body inline">
              <input type="text" placeholder={t.importPlaceholder} aria-label={t.importPlaceholder} value={importId} onChange={(e) => setImportId(e.target.value)} />
              <button type="button" className="ghost-btn" onClick={doImport} disabled={!importId.trim()}>{t.importCta}</button>
            </div>
          </details>
        </div>
        <footer className="panel-foot">
          <div className="foot-status"><Avatar size="xs" mood={training ? 'thinking' : 'idle'} /><span className="cost mono">{training ? t.training : t.defaultHint}</span></div>
          <button type="submit" className="generate" disabled={busy || uploading} aria-busy={busy || uploading}>
            {uploading ? COPY.composer.uploading : busy ? t.sending : t.train}
          </button>
        </footer>
      </form>

      <section className="gallery stage-main" aria-labelledby="cast-title">
        <header className="gallery-head"><h2 id="cast-title">{t.cast}</h2><span className="mono dim">{t.castCount(characters.length)}</span></header>
        {characters.length === 0 ? (
          <div className="empty">
            <Avatar mood="empty" size="md" />
            <p className="empty-title">{t.emptyTitle}</p>
            <p className="dim">{t.emptyText}</p>
          </div>
        ) : (
          <div className="cast">
            {characters.map((c) => {
              const isDefault = defaultId === c.id;
              return (
                <article key={c.id} className={`cast-card status-${c.status} ${isDefault ? 'is-default' : ''}`}>
                  {c.cover ? <img src={c.cover} alt="" /> : <div className="cast-blank mono" aria-hidden>{c.name.slice(0, 2).toUpperCase()}</div>}
                  <div>
                    <b>{c.name} {isDefault && <span className="ftag ftag-flow">{t.isDefault}</span>}</b>
                    <span className="mono dim">{t.versions.find((v) => v.id === c.model_version)?.label} · {t.status[c.status] || c.status}</span>
                    {c.error && <span className="field-error" role="alert">{c.error}</span>}
                    <div className="frame-actions">
                      {c.status === 'completed' && <button type="button" onClick={() => onUse(c)}>{t.use}</button>}
                      {c.status === 'completed' && (
                        <button type="button" onClick={() => makeDefault(c)} aria-pressed={isDefault}>
                          <Icon name="star" size={14} filled={isDefault} /> {isDefault ? t.unsetDefault : t.makeDefault}
                        </button>
                      )}
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(c.id); toast(COPY.toasts.copied, { duration: 2000 }); }}>{t.copyId}</button>
                      <button type="button" className="dim" onClick={() => forgetCharacter(c.id)} aria-label={t.forget}><Icon name="x" size={15} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

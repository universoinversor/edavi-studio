'use client';
import { useCallback, useState } from 'react';
import { forgetCharacter, importCharacter, trainCharacter, useCharacters } from '@/lib/characters';
import { friendlyError } from '@/lib/errors';
import { MediaListField } from './fields';

const VERSIONS = [
  { id: 'v2', label: 'SOUL V2', hint: 'Retratos y moda' },
  { id: 'v1', label: 'SOUL', hint: 'Estilos clásicos' },
  { id: 'cinema', label: 'SOUL Cinema', hint: 'Fotogramas de cine' },
];

const STATUS = { not_ready: 'Preparando', queued: 'En cola', in_progress: 'Entrenando', completed: 'Listo', failed: 'Falló' };

const imagesField = {
  key: 'input_images', label: 'Fotos del personaje', required: true, accept: 'image', kind: 'mediaList',
  prop: { type: 'array', maxItems: 100, minItems: 1 },
};

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

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Ponle un nombre al personaje.');
    if (!images.length) return setError('Sube al menos una foto (mejor 10–20 variadas).');
    setBusy(true);
    try {
      await trainCharacter({ name: name.trim().slice(0, 100), modelVersion: version, imageUrls: images });
      setName('');
      setImages([]);
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

  return (
    <div className="characters">
      <form className="composer" onSubmit={submit}>
        <header className="model-head">
          <div className="model-button static"><span className="mono dim">Entrenamiento</span><span className="model-name">Soul ID</span></div>
          <p className="model-desc">Entrena un personaje reutilizable a partir de tus fotos. Cuando esté listo, elígelo en «Personaje (Soul ID)» dentro de los modelos SOUL de la misma versión.</p>
        </header>
        <div className="composer-body">
          <label className="field">
            <div className="field-label"><span>Nombre<b className="req">*</b></span><span className="mono dim">{name.length}/100</span></div>
            <input type="text" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Valeria editorial" />
          </label>
          <div className="field">
            <div className="field-label"><span>Versión de SOUL</span></div>
            <div className="chips">
              {VERSIONS.map((v) => (
                <button type="button" key={v.id} className={`chip ${version === v.id ? 'on' : ''}`} onClick={() => setVersion(v.id)} title={v.hint}>{v.label}</button>
              ))}
            </div>
          </div>
          <MediaListField field={imagesField} value={images} onChange={(v) => setImages((prev) => (typeof v === 'function' ? v(prev) : v))} onBusy={onBusy} />
          <p className="hint">Consejo: usa fotos nítidas de la misma persona, con ángulos, luz y expresiones distintas.</p>
          {error && <p className="field-error">{error}</p>}
          <details className="fold">
            <summary><span>Importar un Soul ID existente</span></summary>
            <div className="inline">
              <input type="text" placeholder="ID del personaje (uuid)" value={importId} onChange={(e) => setImportId(e.target.value)} />
              <button type="button" className="ghost-btn" onClick={doImport} disabled={!importId.trim()}>Importar</button>
            </div>
          </details>
        </div>
        <footer className="generate-bar">
          <div className="mono dim endpoint">POST /v1/custom-references</div>
          <button type="submit" className="generate" disabled={busy || uploading}>
            <span>{uploading ? 'Subiendo…' : busy ? 'Enviando…' : 'Entrenar'}</span>
          </button>
        </footer>
      </form>

      <section className="gallery">
        <header className="gallery-head"><h2>Reparto</h2><span className="mono dim">{characters.length} personajes</span></header>
        {characters.length === 0 ? (
          <div className="empty"><p className="empty-title">Aún no hay reparto.</p><p className="dim">Los personajes que entrenes aparecerán aquí.</p></div>
        ) : (
          <div className="cast">
            {characters.map((c) => (
              <article key={c.id} className={`cast-card status-${c.status}`}>
                {c.cover ? <img src={c.cover} alt="" /> : <div className="cast-blank mono">{c.name.slice(0, 2).toUpperCase()}</div>}
                <div>
                  <b>{c.name}</b>
                  <span className="mono dim">{VERSIONS.find((v) => v.id === c.model_version)?.label} · {STATUS[c.status] || c.status}</span>
                  {c.error && <span className="field-error">{c.error}</span>}
                  <div className="frame-actions">
                    {c.status === 'completed' && <button type="button" onClick={() => onUse(c)}>Usar →</button>}
                    <button type="button" onClick={() => navigator.clipboard?.writeText(c.id)}>Copiar ID</button>
                    <button type="button" className="dim" onClick={() => forgetCharacter(c.id)} aria-label="Quitar de la lista">×</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

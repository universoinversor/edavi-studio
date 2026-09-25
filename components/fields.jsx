'use client';
import { useEffect, useRef, useState } from 'react';
import { enumLabel } from '@/lib/schema';
import { generation } from '@/lib/providers';
import { friendlyError } from '@/lib/errors';
import { COPY } from '@/lib/copy';

const tf = COPY.fields;
import { useCharacters } from '@/lib/characters';
import Icon from './Icon';

const ACCEPT = { image: 'image/*', video: 'video/mp4,video/*', audio: 'audio/wav,audio/*' };
const ACCEPT_LABEL = { image: 'JPG · PNG · WEBP', video: 'MP4', audio: 'WAV' };

function Label({ field, children, aside }) {
  return (
    <div className="field-label">
      <span>
        {field.label}
        {field.required && <b className="req" title={tf.required} aria-label={tf.required}>*</b>}
      </span>
      {aside ?? children}
    </div>
  );
}

// ---------- Texto ----------

export function PromptField({ field, value, onChange, onSubmit, big }) {
  const max = field.prop.maxLength;
  return (
    <label className={`field ${big ? 'field-prompt' : ''}`}>
      <Label field={field} aside={max ? <span className="mono dim">{(value || '').length}/{max}</span> : null} />
      <textarea
        value={value || ''}
        rows={big ? 5 : 2}
        maxLength={max}
        placeholder={big ? tf.promptPlaceholder : tf.negativePlaceholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onSubmit?.(); }
        }}
      />
    </label>
  );
}

export function StringField({ field, value, onChange, placeholder }) {
  return (
    <label className="field">
      <Label field={field} />
      <input type="text" value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function TagsField({ field, value, onChange }) {
  const [text, setText] = useState((value || []).join(', '));
  return (
    <label className="field">
      <Label field={field} />
      <input
        type="text" value={text} placeholder={tf.tagsPlaceholder}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean)); }}
      />
    </label>
  );
}

// ---------- Selección ----------

function RatioGlyph({ ratio }) {
  const [w, h] = String(ratio).split(':').map(Number);
  if (!w || !h) return <span className="ratio-glyph ratio-auto">A</span>;
  const s = 14 / Math.max(w, h);
  return <span className="ratio-glyph" style={{ width: Math.max(4, w * s), height: Math.max(4, h * s) }} />;
}

export function EnumField({ field, value, onChange }) {
  const options = field.prop.enum;
  const isRatio = field.key === 'aspect_ratio';
  const chips = options.length <= 7 || isRatio;
  if (!chips) {
    return (
      <label className="field">
        <Label field={field} />
        <select value={value ?? ''} onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? undefined : options.find((o) => String(o) === raw));
        }}>
          {!field.required && field.prop.default === undefined && <option value="">{tf.unset}</option>}
          {options.map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}
        </select>
      </label>
    );
  }
  return (
    <div className="field">
      <Label field={field} />
      <div className={`chips ${isRatio ? 'chips-ratio' : ''}`} role="radiogroup" aria-label={field.label}>
        {options.map((o) => (
          <button
            type="button" key={o} role="radio" aria-checked={value === o}
            className={`chip ${value === o ? 'on' : ''}`}
            onClick={() => onChange(value === o && !field.required && field.prop.default === undefined ? undefined : o)}
          >
            {isRatio && <RatioGlyph ratio={o} />}
            {field.key === 'duration' ? `${o}s` : enumLabel(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleField({ field, value, onChange }) {
  return (
    <label className="field field-toggle">
      <span className="field-label"><span>{field.label}</span></span>
      <input type="checkbox" className="toggle" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function RangeField({ field, value, onChange }) {
  const { minimum: min, maximum: max, type } = field.prop;
  const step = type === 'integer' ? 1 : (max - min) / 100;
  const current = value ?? field.prop.default ?? min;
  const unit = field.key === 'duration' ? 's' : '';
  return (
    <label className="field">
      <Label field={field} aside={<span className="mono accent">{type === 'integer' ? current : Number(current).toFixed(2)}{unit}</span>} />
      <input type="range" min={min} max={max} step={step} value={current} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function NumberField({ field, value, onChange }) {
  return (
    <label className="field">
      <Label field={field} />
      <input type="number" value={value ?? ''} min={field.prop.minimum} max={field.prop.maximum}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    </label>
  );
}

export function SeedField({ field, value, onChange }) {
  const min = field.prop.minimum ?? 1;
  const max = field.prop.maximum ?? 2147483647;
  return (
    <label className="field">
      <Label field={field} aside={<span className="dim mono">{tf.seedEmpty}</span>} />
      <div className="inline">
        <input type="number" value={value ?? ''} min={min} max={max} placeholder={tf.seedPlaceholder}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
        <button type="button" className="icon-btn" title={tf.seedRandom} aria-label={tf.seedRandom}
          onClick={() => onChange(min + Math.floor(Math.random() * Math.min(max - min, 999999)))}><Icon name="dice" /></button>
      </div>
    </label>
  );
}

// ---------- Color ----------

const toHex = (rgb) => '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function ColorsField({ field, value, onChange }) {
  const list = value || [];
  return (
    <div className="field">
      <Label field={field} aside={<span className="dim mono">{tf.colors(list.length)}</span>} />
      <div className="swatches">
        {list.map((c, i) => (
          <span key={i} className="swatch">
            <input type="color" value={toHex(c.rgb)} onChange={(e) => onChange(list.map((x, j) => (j === i ? { rgb: fromHex(e.target.value) } : x)))} />
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label={tf.removeColor}>×</button>
          </span>
        ))}
        <button type="button" className="swatch-add" onClick={() => onChange([...list, { rgb: [255, 75, 31] }])}>{tf.addColor}</button>
      </div>
    </div>
  );
}

export function ColorField({ field, value, onChange }) {
  return (
    <div className="field field-toggle">
      <span className="field-label"><span>{field.label}</span></span>
      <div className="inline">
        {value && <input type="color" value={toHex(value.rgb)} onChange={(e) => onChange({ rgb: fromHex(e.target.value) })} />}
        <button type="button" className="ghost-btn" onClick={() => onChange(value ? undefined : { rgb: [255, 255, 255] })}>
          {value ? tf.remove : tf.choose}
        </button>
      </div>
    </div>
  );
}

// ---------- Tomas múltiples (Kling) ----------

export function ShotsField({ field, value, onChange }) {
  const shots = value?.length ? value : [{ prompt: '', duration: 3 }];
  const itemProps = field.prop.items?.properties || {};
  const maxShots = field.prop.maxItems || 6;
  const maxDur = itemProps.duration?.maximum || 15;
  const total = shots.reduce((s, x) => s + (Number(x.duration) || 0), 0);
  const set = (next) => onChange(next);
  return (
    <div className="field">
      <Label field={field} aside={<span className="mono dim">{tf.shots(shots.length, maxShots, total)}</span>} />
      <ol className="shots">
        {shots.map((s, i) => (
          <li key={i}>
            <span className="shot-n mono">{String(i + 1).padStart(2, '0')}</span>
            <textarea rows={2} maxLength={itemProps.prompt?.maxLength} value={s.prompt} placeholder={tf.shotPlaceholder(i + 1)}
              onChange={(e) => set(shots.map((x, j) => (j === i ? { ...x, prompt: e.target.value } : x)))} />
            <input type="number" min={1} max={maxDur} value={s.duration} aria-label={tf.shotDuration}
              onChange={(e) => set(shots.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} />
            {shots.length > 1 && <button type="button" className="icon-btn" onClick={() => set(shots.filter((_, j) => j !== i))} aria-label={tf.removeShot}>×</button>}
          </li>
        ))}
      </ol>
      {shots.length < maxShots && (
        <button type="button" className="ghost-btn" onClick={() => set([...shots, { prompt: '', duration: 3 }])}>{tf.addShot}</button>
      )}
    </div>
  );
}

// ---------- Medios ----------

function Preview({ url, accept }) {
  if (accept === 'video') return <video src={url} muted loop playsInline autoPlay />;
  if (accept === 'audio') return <span className="audio-chip mono">{tf.audio}</span>;
  return <img src={url} alt="" />;
}

function useUploader(onDone) {
  const [state, setState] = useState(null);
  async function run(file) {
    setState({ progress: 0, name: file.name });
    try {
      const url = await generation.upload(file, (p) => setState({ progress: p, name: file.name }));
      setState(null);
      onDone(url);
    } catch (err) {
      setState({ error: err.status ? friendlyError(err) : err.message });
    }
  }
  return [state, run, () => setState(null)];
}

function DropZone({ accept, onFiles, multiple, children, disabled }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`dropzone ${over ? 'over' : ''} ${disabled ? 'disabled' : ''}`}
      role="button" tabIndex={0}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const url = e.dataTransfer.getData('text/uri-list');
        if (!disabled) onFiles([...e.dataTransfer.files], url);
      }}
    >
      <input ref={input} type="file" hidden accept={ACCEPT[accept]} multiple={multiple}
        onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
      {children}
    </div>
  );
}

const NOUN = tf.nouns;

function MediaGlyph({ kind }) {
  const paths = {
    image: <><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9.5" cy="10" r="1.6" /><path d="m5 17 4.5-4.5 3.5 3.5 2.5-2.5L19 17" /></>,
    video: <><rect x="3.5" y="6" width="12" height="12" rx="3" /><path d="m15.5 10.5 5-3v9l-5-3" /></>,
    audio: <><path d="M9 17V6l10-2v11" /><circle cx="6.5" cy="17" r="2.5" /><circle cx="16.5" cy="15" r="2.5" /></>,
  };
  return <span className="glyph"><svg viewBox="0 0 24 24" aria-hidden>{paths[kind]}</svg></span>;
}

// Tarjeta de subida grande: iconos, título, formatos y etiqueta «Opcional».
function UploadCard({ field, many, max }) {
  const [one, plural] = NOUN[field.accept];
  return (
    <span className="upload-card">
      {!field.required && <em className="optional">{tf.optional}</em>}
      <span className="glyphs"><MediaGlyph kind={field.accept} /></span>
      <b>{tf.upload(many ? plural : one)}</b>
      <span className="upload-sub">{many ? tf.upTo(max) : ''}{ACCEPT_LABEL[field.accept]}</span>
    </span>
  );
}

export function MediaField({ field, value, onChange, onBusy }) {
  const [upload, run, reset] = useUploader(onChange);
  const [pasting, setPasting] = useState(false);
  useEffect(() => { onBusy?.(field.key, Boolean(upload && !upload.error)); }, [upload, field.key, onBusy]);
  return (
    <div className="field">
      <Label field={field} aside={
        <button type="button" className="link-btn mono" onClick={() => setPasting((p) => !p)}>{pasting ? tf.uploadFile : tf.pasteUrl}</button>
      } />
      {pasting ? (
        <input type="url" placeholder="https://…" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      ) : value ? (
        <div className="media-slot filled">
          <Preview url={value} accept={field.accept} />
          <button type="button" className="media-remove" onClick={() => onChange(undefined)} aria-label={tf.remove}>×</button>
        </div>
      ) : (
        <DropZone accept={field.accept} onFiles={(files, url) => (files[0] ? run(files[0]) : url && onChange(url))} disabled={Boolean(upload && !upload.error)}>
          {upload && !upload.error ? (
            <span className="upload-progress"><i style={{ width: `${Math.round(upload.progress * 100)}%` }} />{tf.uploadingPct(Math.round(upload.progress * 100))}</span>
          ) : (
            <UploadCard field={field} />
          )}
        </DropZone>
      )}
      {upload?.error && <p className="field-error" onClick={reset}>{upload.error}</p>}
    </div>
  );
}

export function MediaListField({ field, value, onChange, onBusy }) {
  const list = value || [];
  const max = field.prop.maxItems || 10;
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState(null);
  const latest = useRef(list);
  latest.current = list;
  useEffect(() => { onBusy?.(field.key, busy > 0); }, [busy, field.key, onBusy]);

  async function add(files, url) {
    setError(null);
    if (url && !files.length) { onChange([...latest.current, url].slice(0, max)); return; }
    const room = max - latest.current.length;
    const chosen = files.slice(0, room);
    if (files.length > room) setError(tf.tooMany(max, files.length - room));
    setBusy((b) => b + chosen.length);
    await Promise.all(chosen.map(async (f) => {
      try {
        const u = await generation.upload(f);
        // Actualización funcional: varias subidas en paralelo no se pisan.
        onChange((prev) => [...(prev || []), u].slice(0, max));
      } catch (err) {
        setError(err.status ? friendlyError(err) : err.message);
      } finally {
        setBusy((b) => b - 1);
      }
    }));
  }

  return (
    <div className="field">
      <Label field={field} aside={<span className="mono dim">{list.length}/{max}</span>} />
      {list.length === 0 && busy === 0 ? (
        <DropZone accept={field.accept} multiple onFiles={add}>
          <UploadCard field={field} many max={max} />
        </DropZone>
      ) : (
      <div className="media-grid">
        {list.map((u, i) => (
          <div className="media-slot filled small" key={u + i}>
            <span className="media-index mono">{i + 1}</span>
            <Preview url={u} accept={field.accept} />
            <button type="button" className="media-remove" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label={tf.remove}>×</button>
          </div>
        ))}
        {Array.from({ length: busy }, (_, i) => <div key={`b${i}`} className="media-slot small loading" />)}
        {list.length + busy < max && (
          <DropZone accept={field.accept} multiple onFiles={add}>
            <span className="drop-copy small"><b>+</b><em className="mono">{ACCEPT_LABEL[field.accept]}</em></span>
          </DropZone>
        )}
      </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// ---------- Selectores remotos ----------

const styleCache = {};

export function StyleField({ field, value, onChange, version }) {
  const [styles, setStyles] = useState(styleCache[version] || null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (styleCache[version]) { setStyles(styleCache[version]); return; }
    let alive = true;
    generation.listStyles(version)
      .then((list) => { styleCache[version] = list; if (alive) setStyles(list); })
      .catch((err) => alive && setError(friendlyError(err)));
    return () => { alive = false; };
  }, [version]);
  const current = styles?.find((s) => s.id === value);
  return (
    <div className="field">
      <Label field={field} aside={<button type="button" className="link-btn mono" onClick={() => setOpen((o) => !o)}>{open ? tf.closeStyles : tf.styles}</button>} />
      <button type="button" className="style-current" onClick={() => setOpen((o) => !o)}>
        {current?.preview_url && <img src={current.preview_url} alt="" />}
        <span>{current?.name || (value ? tf.defaultStyle : tf.noStyle)}</span>
      </button>
      {error && <p className="field-error">{error}</p>}
      {open && styles && (
        <div className="style-grid">
          {styles.map((s) => (
            <button type="button" key={s.id} className={`style-card ${s.id === value ? 'on' : ''}`} title={s.description}
              onClick={() => { onChange(s.id); setOpen(false); }}>
              {s.preview_url ? <img src={s.preview_url} alt="" loading="lazy" /> : <span className="style-blank" />}
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PresetField({ field, value, onChange }) {
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      generation.listPresets(search.trim() || undefined)
        .then((r) => alive && setItems(r.items || []))
        .catch((err) => alive && setError(friendlyError(err)));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [search]);
  return (
    <div className="field">
      <Label field={field} />
      <input type="search" placeholder={tf.searchPreset} aria-label={tf.searchPreset} value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <p className="field-error">{error}</p>}
      <div className="preset-list">
        {value && <button type="button" className="chip on" onClick={() => onChange(undefined)}>{tf.removePreset}</button>}
        {(items || []).map((p) => (
          <button type="button" key={p.id} className={`chip ${p.id === value ? 'on' : ''}`} onClick={() => onChange(p.id)}>
            {p.name}{p.metadata?.group_name && <em className="mono dim"> · {p.metadata.group_name}</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReferenceField({ field, value, onChange, version }) {
  const characters = useCharacters().filter((c) => c.status === 'completed' && (!version || c.model_version === version));
  return (
    <label className="field">
      <Label field={field} />
      <select value={value || ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{tf.none}</option>
        {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {!characters.length && <span className="hint">{tf.createCharacter(version)}</span>}
    </label>
  );
}

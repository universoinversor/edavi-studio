'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { familiesForStudio, getModel, soulVersion, workflowLabel } from '@/lib/catalog';
import { buildPayload, defaultValues, describeFields, validatePayload } from '@/lib/schema';
import { enqueue } from '@/lib/jobs';
import {
  ColorField, ColorsField, EnumField, MediaField, MediaListField, NumberField, PresetField, PromptField,
  RangeField, ReferenceField, SeedField, ShotsField, StringField, StyleField, TagsField, ToggleField,
} from './fields';
import Portal from './Portal';

// Conserva lo que el usuario ya escribió al cambiar de modelo, si el nuevo lo admite.
function carryValues(model, previous) {
  const next = defaultValues(model.schema);
  for (const [key, value] of Object.entries(previous || {})) {
    const prop = model.schema.properties[key];
    if (!prop || value === undefined) continue;
    const real = prop.anyOf ? prop.anyOf.find((p) => p.type !== 'null') : prop;
    if (real?.enum && !real.enum.includes(value)) continue;
    if (real?.type === 'array' && !Array.isArray(value)) continue;
    next[key] = value;
  }
  return next;
}

function FamilySheet({ studio, currentFamily, onPick, onClose }) {
  const families = familiesForStudio(studio);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Elegir modelo" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Elige un modelo</h2>
          <span className="mono dim">{families.length} familias</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <ul className="family-list">
          {families.map((f, i) => (
            <li key={f.id}>
              <button type="button" className={`family-row ${f.id === currentFamily ? 'on' : ''}`} onClick={() => onPick(f.models[0].id)}>
                <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                <span className="family-name">{f.name}</span>
                <span className="family-desc">{f.description}</span>
                <span className="mono dim">{f.models.length} modo{f.models.length > 1 ? 's' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Composer({ studio, seed, onModelChange }) {
  const [modelId, setModelId] = useState(seed.modelId);
  const [values, setValues] = useState(() => carryValues(getModel(seed.modelId), seed.values));
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [flash, setFlash] = useState(false);

  // Una "semilla" nueva (reutilizar, usar como entrada…) reinicia el formulario.
  useEffect(() => {
    setModelId(seed.modelId);
    setValues(carryValues(getModel(seed.modelId), seed.values));
    setErrors([]);
    // Solo el nonce indica una semilla nueva; recordar el modelo no debe borrar el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.nonce]);

  const model = getModel(modelId);
  const fields = useMemo(() => describeFields(model.schema), [model]);
  const family = useMemo(() => familiesForStudio(studio).find((f) => f.id === model.familyId), [studio, model]);
  const uploading = Object.values(busy).some(Boolean);
  const version = soulVersion(model);

  const setField = useCallback((key, v) => {
    setValues((prev) => ({ ...prev, [key]: typeof v === 'function' ? v(prev[key]) : v }));
    setErrors((prev) => prev.filter((e) => e.key !== key));
  }, []);
  const onBusy = useCallback((key, isBusy) => setBusy((b) => (b[key] === isBusy ? b : { ...b, [key]: isBusy })), []);

  function switchModel(id) {
    const next = getModel(id);
    setModelId(id);
    setValues((prev) => carryValues(next, prev));
    setErrors([]);
    setSheet(false);
    onModelChange?.(id);
  }

  function generate() {
    if (uploading) return;
    const payload = buildPayload(model.schema, values);
    const problems = validatePayload(model.schema, payload);
    setErrors(problems);
    if (problems.length) return;
    enqueue({ model, payload });
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
  }

  const multiShots = values.multi_shots === true;
  const visible = (f) => {
    if (f.key === 'multi_prompt' || f.key === 'shot_type') return multiShots;
    return true;
  };
  const fieldError = (key) => errors.find((e) => e.key === key)?.message;

  function render(f) {
    const common = { field: f, value: values[f.key], onChange: (v) => setField(f.key, v) };
    let control;
    switch (f.kind) {
      case 'text': control = <PromptField {...common} big={f.key === 'prompt'} onSubmit={generate} />; break;
      case 'media': control = <MediaField {...common} onBusy={onBusy} />; break;
      case 'mediaList': control = <MediaListField {...common} onBusy={onBusy} />; break;
      case 'enum': control = <EnumField {...common} />; break;
      case 'toggle': control = <ToggleField {...common} />; break;
      case 'range': control = <RangeField {...common} />; break;
      case 'seed': control = <SeedField {...common} />; break;
      case 'number': control = <NumberField {...common} />; break;
      case 'tags': control = <TagsField {...common} />; break;
      case 'shots': control = <ShotsField {...common} />; break;
      case 'colors': control = <ColorsField {...common} />; break;
      case 'color': control = <ColorField {...common} />; break;
      case 'style': control = <StyleField {...common} version={version === 'v2' ? 'v2' : 'v1'} />; break;
      case 'preset': control = <PresetField {...common} />; break;
      case 'reference': control = <ReferenceField {...common} version={version} />; break;
      case 'url': control = <StringField {...common} placeholder="https://…" />; break;
      default: control = <StringField {...common} />;
    }
    const err = fieldError(f.key);
    return (
      <div key={f.key} className={`field-wrap ${err ? 'has-error' : ''}`}>
        {control}
        {err && <p className="field-error">{err}</p>}
      </div>
    );
  }

  return (
    <section className="composer" aria-label="Compositor">
      <header className="model-head">
        <button type="button" className="model-button" onClick={() => setSheet(true)}>
          <span className="mono dim">Modelo</span>
          <span className="model-name">{model.family}</span>
          <span className="model-caret" aria-hidden>↓</span>
        </button>
        {family?.models.length > 1 && (
          <div className="workflow-chips" role="tablist" aria-label="Modo">
            {family.models.map((m) => (
              <button type="button" role="tab" key={m.id} aria-selected={m.id === modelId}
                className={`chip ${m.id === modelId ? 'on' : ''}`} onClick={() => switchModel(m.id)}>
                {workflowLabel(m.workflow)}
              </button>
            ))}
          </div>
        )}
        <p className="model-desc">{model.familyDescription}</p>
      </header>

      <div className="composer-body">
        {fields.prompt && render(fields.prompt)}
        {fields.media.length > 0 && <div className="media-block">{fields.media.map(render)}</div>}
        <div className="primary-grid">{fields.primary.filter(visible).map(render)}</div>

        {fields.advanced.length > 0 && (
          <details className="fold">
            <summary><span>Avanzado</span><span className="mono dim">{fields.advanced.length}</span></summary>
            <div className="primary-grid">{fields.advanced.filter(visible).map(render)}</div>
          </details>
        )}

        {model.notes.length > 0 && (
          <details className="fold notes">
            <summary><span>Notas del modelo</span><a className="mono dim" href={model.docs} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>docs ↗</a></summary>
            <ul>{model.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </details>
        )}

        {errors.length > 0 && !errors.every((e) => fields.all.some((f) => f.key === e.key && visible(f))) && (
          <ul className="form-errors">{errors.map((e) => <li key={e.message}>{e.message}</li>)}</ul>
        )}
      </div>

      <footer className="generate-bar">
        <div className="mono dim endpoint" title={model.endpoint}>{model.endpoint}</div>
        <button type="button" className={`generate ${flash ? 'flash' : ''}`} onClick={generate} disabled={uploading}>
          <span>{uploading ? 'Subiendo…' : flash ? 'En el revelador' : 'Revelar'}</span>
          <kbd className="mono">Ctrl ↵</kbd>
        </button>
      </footer>

      {sheet && <Portal><FamilySheet studio={studio} currentFamily={model.familyId} onPick={switchModel} onClose={() => setSheet(false)} /></Portal>}
    </section>
  );
}

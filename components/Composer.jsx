'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { familiesForStudio, getModel, models as allModels, soulVersion, workflowLabel } from '@/lib/catalog';
import { buildPayload, describeFields, validatePayload } from '@/lib/schema';
import { animateTargets, applyPromptEntry, carryValues, chainedPayload, compareCandidates, variationPayloads } from '@/lib/plan';
import { GENERAL_TIPS, MODEL_TIPS } from '@/lib/prompt-bank';
import PromptLibrary from './PromptLibrary';
import { enqueue, setEstimate } from '@/lib/jobs';
import { estimateCost } from '@/lib/client';
import {
  ColorField, ColorsField, EnumField, MediaField, MediaListField, NumberField, PresetField, PromptField,
  RangeField, ReferenceField, SeedField, ShotsField, StringField, StyleField, TagsField, ToggleField,
} from './fields';
import Portal from './Portal';
import Icon from './Icon';

const ANIMATE_DEFAULT = 'seedance-2-5/image-to-video';
const newGroup = () => `g${Date.now().toString(36)}`;

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

function sumEstimates(list) {
  const valid = list.filter(Boolean);
  if (!valid.length) return null;
  return {
    credits: valid.reduce((s, e) => s + Number(e.credits || 0), 0),
    usd: valid.reduce((s, e) => s + Number(e.usd || 0), 0),
    partial: valid.length < list.length,
  };
}

export default function Composer({ studio, seed, onModelChange }) {
  const [modelId, setModelId] = useState(seed.modelId);
  const [values, setValues] = useState(() => carryValues(getModel(seed.modelId), seed.values));
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [library, setLibrary] = useState(false);
  const [flash, setFlash] = useState(false);
  const [variations, setVariations] = useState(1);
  const [compareWith, setCompareWith] = useState([]);
  const [animate, setAnimate] = useState({ on: false, modelId: ANIMATE_DEFAULT, prompt: '' });
  const [estimates, setEstimates] = useState({ main: null, compare: {}, loading: false, error: false });

  // Una "semilla" nueva (reutilizar, usar como entrada…) reinicia el formulario.
  useEffect(() => {
    setModelId(seed.modelId);
    setValues(carryValues(getModel(seed.modelId), seed.values));
    setErrors([]);
    setCompareWith([]);
    // Solo el nonce indica una semilla nueva; recordar el modelo no debe borrar el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.nonce]);

  const model = getModel(modelId);
  const fields = useMemo(() => describeFields(model.schema), [model]);
  const family = useMemo(() => familiesForStudio(studio).find((f) => f.id === model.familyId), [studio, model]);
  const uploading = Object.values(busy).some(Boolean);
  const version = soulVersion(model);
  const payload = useMemo(() => buildPayload(model.schema, values), [model, values]);
  const payloadKey = JSON.stringify(payload);
  const isValid = useMemo(() => validatePayload(model.schema, payload).length === 0, [model, payload]);
  const candidates = useMemo(() => compareCandidates(allModels, model, values), [model, values]);
  const chosen = candidates.filter((c) => compareWith.includes(c.model.familyId));
  const targets = useMemo(() => animateTargets(allModels), []);
  const canAnimate = studio === 'image';
  const total = variations + chosen.length;

  // Costo en vivo con el endpoint /estimate de Higgsfield (con retardo para no saturar).
  const chosenKey = chosen.map((c) => c.model.id).join(',');
  useEffect(() => {
    if (!isValid) { setEstimates({ main: null, compare: {}, loading: false, error: false }); return undefined; }
    let alive = true;
    setEstimates((e) => ({ ...e, loading: true }));
    const t = setTimeout(async () => {
      const safe = (p) => p.catch(() => null);
      const [main, ...rest] = await Promise.all([
        safe(estimateCost(model.endpoint, payload)),
        ...chosen.map((c) => safe(estimateCost(c.model.endpoint, c.payload))),
      ]);
      if (!alive) return;
      const compare = Object.fromEntries(chosen.map((c, i) => [c.model.id, rest[i]]));
      setEstimates({ main, compare, loading: false, error: !main });
    }, 650);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.endpoint, payloadKey, isValid, chosenKey]);

  const totalCost = sumEstimates([
    ...Array.from({ length: variations }, () => estimates.main),
    ...chosen.map((c) => estimates.compare[c.model.id] || null),
  ]);

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
    setCompareWith([]);
    setSheet(false);
    onModelChange?.(id);
  }

  // Aplica un prompt de la biblioteca (con sus parámetros y tomas si el modelo los admite).
  function usePrompt(entry) {
    setValues((prev) => applyPromptEntry(model, prev, entry));
    setErrors([]);
    setLibrary(false);
  }
  const tips = MODEL_TIPS[model.familyId] || GENERAL_TIPS[studio] || [];

  function generate() {
    if (uploading) return;
    const problems = validatePayload(model.schema, payload);
    let then = null;
    if (canAnimate && animate.on) {
      const target = getModel(animate.modelId);
      const test = chainedPayload(target, { prompt: animate.prompt }, 'https://example.com/x.png');
      const chainProblems = validatePayload(target.schema, test);
      if (chainProblems.length) problems.push({ key: '_animate', message: `Animación: ${chainProblems[0].message}` });
      then = { modelId: target.id, values: { prompt: animate.prompt }, inputKey: 'image_url' };
    }
    setErrors(problems);
    if (problems.length) return;

    const group = total > 1 ? newGroup() : null;
    variationPayloads(model, payload, variations).forEach((p, i) => {
      enqueue({ model, payload: p, estimate: estimates.main, then, group, label: variations > 1 ? `Variación ${i + 1}/${variations}` : null });
    });
    for (const c of chosen) {
      const id = enqueue({ model: c.model, payload: c.payload, estimate: estimates.compare[c.model.id], group, label: 'Comparación' });
      if (!estimates.compare[c.model.id]) estimateCost(c.model.endpoint, c.payload).then((e) => setEstimate(id, e)).catch(() => {});
    }
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

  const looseErrors = errors.filter((e) => !fields.all.some((f) => f.key === e.key && visible(f)));

  return (
    <section className="composer panel" aria-label="Compositor">
      {family?.models.length > 1 && (
        <nav className="panel-tabs" role="tablist" aria-label="Modo">
          {family.models.map((m) => (
            <button type="button" role="tab" key={m.id} aria-selected={m.id === modelId}
              className={m.id === modelId ? 'on' : ''} onClick={() => switchModel(m.id)}>
              {workflowLabel(m.workflow)}
            </button>
          ))}
        </nav>
      )}

      <div className="panel-scroll">
        {fields.media.length > 0 && <div className="media-block">{fields.media.map(render)}</div>}

        {fields.prompt && (
          <div className="prompt-wrap">
            <button type="button" className="inspire" onClick={() => setLibrary(true)}><Icon name="sparkles" size={14} /> Biblioteca</button>
            {render(fields.prompt)}
          </div>
        )}
        {fields.prompt && tips.length > 0 && (
          <details className="tips">
            <summary><Icon name="bulb" size={15} /> {tips[0]}</summary>
            {tips.length > 1 && <ul>{tips.slice(1).map((t) => <li key={t}>{t}</li>)}</ul>}
          </details>
        )}

        <button type="button" className="row-card model-row" onClick={() => setSheet(true)}>
          <span className="row-text">
            <span className="row-label">Modelo</span>
            <b>{model.family}</b>
          </span>
          <span className="row-chevron" aria-hidden>›</span>
        </button>

        <div className="primary-grid">{fields.primary.filter(visible).map(render)}</div>

        <div className="row-card stepper-row">
          <span className="row-label-inline">Cantidad</span>
          <div className="stepper" role="group" aria-label="Variaciones">
            <button type="button" onClick={() => setVariations((v) => Math.max(1, v - 1))} disabled={variations <= 1} aria-label="Menos">−</button>
            <span className="mono">{variations}/4</span>
            <button type="button" onClick={() => setVariations((v) => Math.min(4, v + 1))} disabled={variations >= 4} aria-label="Más">+</button>
          </div>
        </div>

        <details className="row-card advanced" open={compareWith.length > 0 || animate.on || undefined}>
          <summary>
            <span className="adv-title"><Icon name="sliders" size={16} /> Configuración avanzada</span>
            <span className="row-chevron" aria-hidden>›</span>
          </summary>
          <div className="advanced-body">
            {fields.advanced.length > 0 && <div className="primary-grid">{fields.advanced.filter(visible).map(render)}</div>}

            {canAnimate && (
              <div className={`power ${animate.on ? 'on' : ''}`}>
                <label className="power-head">
                  <span><b>Animar al terminar</b><em>La imagen se convierte en video automáticamente.</em></span>
                  <input type="checkbox" className="toggle" checked={animate.on} onChange={(e) => setAnimate((a) => ({ ...a, on: e.target.checked }))} />
                </label>
                {animate.on && (
                  <div className="power-body">
                    <select value={animate.modelId} onChange={(e) => setAnimate((a) => ({ ...a, modelId: e.target.value }))} aria-label="Modelo de video">
                      {targets.map((m) => <option key={m.id} value={m.id}>{m.family} · {workflowLabel(m.workflow)}</option>)}
                    </select>
                    <textarea rows={2} value={animate.prompt} placeholder="Movimiento: la cámara orbita lentamente, el pelo se mueve con el viento…"
                      onChange={(e) => setAnimate((a) => ({ ...a, prompt: e.target.value }))} />
                  </div>
                )}
              </div>
            )}

            {candidates.length > 0 && (
              <div className="compare">
                <div className="field-label"><span>Comparar con otros modelos</span><span className="mono dim">{compareWith.length ? `${chosen.length}/3` : `${candidates.length} compatibles`}</span></div>
                <div className="chips">
                  {candidates.map(({ model: m }) => {
                    const on = compareWith.includes(m.familyId);
                    return (
                      <button type="button" key={m.familyId} className={`chip ${on ? 'on' : ''}`}
                        disabled={!on && compareWith.length >= 3}
                        onClick={() => setCompareWith((list) => (on ? list.filter((x) => x !== m.familyId) : [...list, m.familyId]))}>
                        {m.family}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {model.notes.length > 0 && (
              <div className="notes">
                <div className="field-label"><span>Notas del modelo</span><a className="mono" href={model.docs} target="_blank" rel="noreferrer">docs ↗</a></div>
                <ul>{model.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            )}
          </div>
        </details>

        {looseErrors.length > 0 && (
          <ul className="form-errors">{looseErrors.map((e) => <li key={e.message}>{e.message}</li>)}</ul>
        )}
      </div>

      <footer className="panel-foot">
        <span className="cost mono" title="Estimación de Higgsfield antes de generar">
          {!isValid ? 'Completa los campos obligatorios' : estimates.loading ? 'Calculando costo…'
            : totalCost ? `≈ ${totalCost.credits.toFixed(totalCost.credits < 10 ? 2 : 1)} créditos · $${totalCost.usd.toFixed(2)}${totalCost.partial ? '+' : ''}`
              : 'Costo no disponible'}
        </span>
        <button type="button" className={`generate ${flash ? 'flash' : ''}`} onClick={generate} disabled={uploading}>
          {uploading ? 'Subiendo…' : flash ? '¡Enviado!' : total > 1 ? `Generar ${total}` : 'Generar'}
        </button>
      </footer>

      {library && (
        <Portal>
          <PromptLibrary kind={studio} familyId={model.familyId} familyName={model.family} onUse={usePrompt} onClose={() => setLibrary(false)} />
        </Portal>
      )}
      {sheet && <Portal><FamilySheet studio={studio} currentFamily={model.familyId} onPick={switchModel} onClose={() => setSheet(false)} /></Portal>}
    </section>
  );
}

'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { familiesForStudio, getModel, models as allModels, soulVersion, workflowLabel } from '@/lib/catalog';
import { buildPayload, describeFields, validatePayload } from '@/lib/schema';
import { animateTargets, applyPromptEntry, carryValues, chainedPayload, compareCandidates, variationPayloads } from '@/lib/plan';
import { GENERAL_TIPS, MODEL_TIPS } from '@/lib/prompt-bank';
import { enqueue, setEstimate } from '@/lib/jobs';
import { generation } from '@/lib/providers';
import { clearDraft, hasContent, loadDraft, saveDraft } from '@/lib/drafts';
import { COPY } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { useDialog } from '@/lib/useDialog';
import { useMascotMood } from '@/lib/mascot';
import { useCharacters, withDefaultAvatar } from '@/lib/characters';
import { requestAccess, useRole } from '@/lib/role';
import Avatar from './Avatar';
import {
  ColorField, ColorsField, EnumField, MediaField, MediaListField, NumberField, PresetField, PromptField,
  RangeField, ReferenceField, SeedField, ShotsField, StringField, StyleField, TagsField, ToggleField,
} from './fields';
import PromptLibrary from './PromptLibrary';
import Portal from './Portal';
import Icon from './Icon';

const t = COPY.composer;
const ANIMATE_DEFAULT = 'seedance-2-5/image-to-video';
const newGroup = () => `g${Date.now().toString(36)}`;

function FamilySheet({ studio, currentFamily, onPick, onClose }) {
  const families = familiesForStudio(studio);
  const ref = useDialog(onClose);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby="family-title" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2 id="family-title">{t.chooseModel}</h2>
          <span className="mono dim">{t.families(families.length)}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}><Icon name="x" /></button>
        </header>
        <ul className="family-list">
          {families.map((f, i) => (
            <li key={f.id}>
              <button type="button" className={`family-row ${f.id === currentFamily ? 'on' : ''}`} onClick={() => onPick(f.models[0].id)}
                aria-current={f.id === currentFamily ? 'true' : undefined}>
                <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                <span className="family-name">{f.name}</span>
                <span className="family-desc">{f.description}</span>
                <span className="mono dim">{t.modesCount(f.models.length)}</span>
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

// Estado inicial: gana lo más reciente entre la última acción explícita del usuario
// (reusar, animar, usar un prompt…) y el borrador guardado.
function initialState(studio, seed) {
  const saved = loadDraft(studio);
  const draft = saved && (!seed.explicit || saved.savedAt > seed.at) ? saved : null;
  const model = getModel(draft?.modelId) || getModel(seed.modelId);
  return { modelId: model.id, values: carryValues(model, draft ? draft.values : seed.values), restored: Boolean(draft && hasContent(draft.values)) };
}

export default function Composer({ studio, seed, onModelChange }) {
  const { canCreate } = useRole();
  const [start] = useState(() => initialState(studio, seed));
  const [modelId, setModelId] = useState(start.modelId);
  const [values, setValues] = useState(start.values);
  const [restored, setRestored] = useState(start.restored);
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [library, setLibrary] = useState(false);
  const [flash, setFlash] = useState(false);
  const [variations, setVariations] = useState(1);
  const [compareWith, setCompareWith] = useState([]);
  const [animate, setAnimate] = useState({ on: false, modelId: ANIMATE_DEFAULT, prompt: '' });
  const [estimates, setEstimates] = useState({ main: null, compare: {}, loading: false, error: false });
  const panelRef = useRef(null);
  const mood = useMascotMood();
  const characters = useCharacters();
  const firstSeed = useRef(seed.nonce);

  // Una «semilla» nueva (reutilizar, usar como entrada…) reinicia el formulario.
  useEffect(() => {
    if (seed.nonce === firstSeed.current || !seed.explicit) return;
    setModelId(seed.modelId);
    setValues(carryValues(getModel(seed.modelId), seed.values));
    setErrors([]);
    setCompareWith([]);
    setRestored(false);
    // Solo el nonce indica una semilla nueva; recordar el modelo no debe borrar el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.nonce]);

  // Avatar principal: se aplica al abrir un modelo SOUL compatible si no hay otro elegido.
  useEffect(() => {
    setValues((prev) => withDefaultAvatar(getModel(modelId), prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, characters]);

  // Autoguardado del borrador (con retardo para no escribir en cada tecla).
  useEffect(() => {
    const timer = setTimeout(() => saveDraft(studio, modelId, values), 500);
    return () => clearTimeout(timer);
  }, [studio, modelId, values]);

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

  // Costo en vivo con el endpoint de estimación del proveedor (con retardo para no saturar).
  const chosenKey = chosen.map((c) => c.model.id).join(',');
  useEffect(() => {
    if (!isValid) { setEstimates({ main: null, compare: {}, loading: false, error: false }); return undefined; }
    let alive = true;
    setEstimates((e) => ({ ...e, loading: true }));
    const timer = setTimeout(async () => {
      const safe = (p) => p.catch(() => null);
      const [main, ...rest] = await Promise.all([
        safe(generation.estimate(model.endpoint, payload)),
        ...chosen.map((c) => safe(generation.estimate(c.model.endpoint, c.payload))),
      ]);
      if (!alive) return;
      const compare = Object.fromEntries(chosen.map((c, i) => [c.model.id, rest[i]]));
      setEstimates({ main, compare, loading: false, error: !main });
    }, 650);
    return () => { alive = false; clearTimeout(timer); };
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
    setValues((prev) => withDefaultAvatar(next, carryValues(next, prev)));
    setErrors([]);
    setCompareWith([]);
    setSheet(false);
    onModelChange?.(id);
  }

  function startOver() {
    clearDraft(studio);
    setValues(carryValues(model, {}));
    setRestored(false);
    setErrors([]);
  }

  // Aplica un prompt de la biblioteca (con sus parámetros y tomas si el modelo los admite).
  function usePrompt(entry) {
    setValues((prev) => applyPromptEntry(model, prev, entry));
    setErrors([]);
    setLibrary(false);
    toast(COPY.prompts.applied, { tone: 'success', duration: 2500 });
  }
  const tips = MODEL_TIPS[model.familyId] || GENERAL_TIPS[studio] || [];

  // Tras un intento fallido, el foco va al primer campo con error.
  function focusFirstError() {
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector('.has-error input, .has-error textarea, .has-error select, .has-error button, .form-errors');
      target?.focus?.();
      target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    });
  }

  function generate() {
    if (!canCreate) { requestAccess(); return; }
    if (uploading) return;
    const problems = validatePayload(model.schema, payload);
    let then = null;
    if (canAnimate && animate.on) {
      const target = getModel(animate.modelId);
      const test = chainedPayload(target, { prompt: animate.prompt }, 'https://example.com/x.png');
      const chainProblems = validatePayload(target.schema, test);
      if (chainProblems.length) problems.push({ key: '_animate', message: t.animateError(chainProblems[0].message) });
      then = { modelId: target.id, values: { prompt: animate.prompt }, inputKey: 'image_url' };
    }
    setErrors(problems);
    if (problems.length) { focusFirstError(); return; }

    const group = total > 1 ? newGroup() : null;
    variationPayloads(model, payload, variations).forEach((p, i) => {
      enqueue({ model, payload: p, estimate: estimates.main, then, group, label: variations > 1 ? t.variationLabel(i + 1, variations) : null });
    });
    for (const c of chosen) {
      const id = enqueue({ model: c.model, payload: c.payload, estimate: estimates.compare[c.model.id], group, label: t.compareLabel });
      if (!estimates.compare[c.model.id]) generation.estimate(c.model.endpoint, c.payload).then((e) => setEstimate(id, e)).catch(() => {});
    }
    setRestored(false);
    setFlash(true);
    toast(COPY.toasts.sent(total), { tone: 'success', duration: 3000 });
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
        {err && <p className="field-error" role="alert">{err}</p>}
      </div>
    );
  }

  const looseErrors = errors.filter((e) => !fields.all.some((f) => f.key === e.key && visible(f)));
  const cost = !isValid ? t.cost.incomplete : estimates.loading ? t.cost.loading
    : totalCost ? t.cost.value(totalCost.credits.toFixed(totalCost.credits < 10 ? 2 : 1), totalCost.usd.toFixed(2), totalCost.partial)
      : t.cost.unavailable;

  return (
    <section ref={panelRef} className="composer panel" aria-label={t.label}>
      {family?.models.length > 1 && (
        <nav className="panel-tabs" role="tablist" aria-label={t.modes}>
          {family.models.map((m) => (
            <button type="button" role="tab" key={m.id} aria-selected={m.id === modelId}
              className={m.id === modelId ? 'on' : ''} onClick={() => switchModel(m.id)}>
              {workflowLabel(m.workflow)}
            </button>
          ))}
        </nav>
      )}

      <div className="panel-scroll">
        {restored && (
          <div className="draft-note" role="status">
            <Icon name="history" size={16} />
            <span>{t.draftRestored}</span>
            <button type="button" className="link-btn" onClick={startOver}>{t.clearDraft}</button>
          </div>
        )}

        {fields.media.length > 0 && <div className="media-block">{fields.media.map(render)}</div>}

        {fields.prompt && (
          <div className="prompt-wrap">
            <button type="button" className="inspire" onClick={() => setLibrary(true)}><Icon name="sparkles" size={14} /> {t.library}</button>
            {render(fields.prompt)}
          </div>
        )}
        {fields.prompt && tips.length > 0 && (
          <details className="tips">
            <summary><Icon name="bulb" size={15} /> {tips[0]}</summary>
            {tips.length > 1 && <ul>{tips.slice(1).map((tip) => <li key={tip}>{tip}</li>)}</ul>}
          </details>
        )}

        <button type="button" className="row-card model-row" onClick={() => setSheet(true)} aria-haspopup="dialog">
          <span className="row-text">
            <span className="row-label">{t.model}</span>
            <b>{model.family}</b>
          </span>
          <span className="row-chevron" aria-hidden>›</span>
        </button>

        <div className="primary-grid">{fields.primary.filter(visible).map(render)}</div>

        <div className="row-card stepper-row">
          <span className="row-label-inline" id="qty-label">{t.quantity}</span>
          <div className="stepper" role="group" aria-labelledby="qty-label">
            <button type="button" onClick={() => setVariations((v) => Math.max(1, v - 1))} disabled={variations <= 1} aria-label={t.less}>−</button>
            <span className="mono" aria-live="polite">{variations}/4</span>
            <button type="button" onClick={() => setVariations((v) => Math.min(4, v + 1))} disabled={variations >= 4} aria-label={t.more}>+</button>
          </div>
        </div>

        <details className="row-card advanced" open={compareWith.length > 0 || animate.on || undefined}>
          <summary>
            <span className="adv-title"><Icon name="sliders" size={16} /> {t.advanced}</span>
            <span className="row-chevron" aria-hidden>›</span>
          </summary>
          <div className="advanced-body">
            {fields.advanced.length > 0 && <div className="primary-grid">{fields.advanced.filter(visible).map(render)}</div>}

            {canAnimate && (
              <div className={`power ${animate.on ? 'on' : ''}`}>
                <label className="power-head">
                  <span><b>{t.animate[0]}</b><em>{t.animate[1]}</em></span>
                  <input type="checkbox" className="toggle" checked={animate.on} onChange={(e) => setAnimate((a) => ({ ...a, on: e.target.checked }))} />
                </label>
                {animate.on && (
                  <div className="power-body">
                    <select value={animate.modelId} onChange={(e) => setAnimate((a) => ({ ...a, modelId: e.target.value }))} aria-label={t.animateModel}>
                      {targets.map((m) => <option key={m.id} value={m.id}>{m.family} · {workflowLabel(m.workflow)}</option>)}
                    </select>
                    <textarea rows={2} value={animate.prompt} placeholder={t.animatePlaceholder} aria-label={t.animate[0]}
                      onChange={(e) => setAnimate((a) => ({ ...a, prompt: e.target.value }))} />
                  </div>
                )}
              </div>
            )}

            {candidates.length > 0 && (
              <div className="compare">
                <div className="field-label"><span>{t.compare}</span><span className="mono dim">{t.compareCount(compareWith.length ? chosen.length : 0, candidates.length)}</span></div>
                <div className="chips">
                  {candidates.map(({ model: m }) => {
                    const on = compareWith.includes(m.familyId);
                    return (
                      <button type="button" key={m.familyId} className={`chip ${on ? 'on' : ''}`} aria-pressed={on}
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
                <div className="field-label"><span>{t.notes}</span><a className="mono" href={model.docs} target="_blank" rel="noreferrer">{t.docs}</a></div>
                <ul>{model.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            )}
          </div>
        </details>

        {looseErrors.length > 0 && (
          <ul className="form-errors" role="alert" tabIndex={-1}>{looseErrors.map((e) => <li key={e.message}>{e.message}</li>)}</ul>
        )}
      </div>

      <footer className="panel-foot">
        <div className="foot-status">
          <Avatar size="xs" mood={mood} />
          <span className="cost mono" title={t.cost.hint} aria-live="polite">{mood === 'thinking' || mood === 'offline' ? COPY.avatar.moods[mood] : cost}</span>
        </div>
        <button type="button" className={`generate ${flash ? 'flash' : ''}`} onClick={generate} disabled={uploading} aria-busy={uploading}>
          {!canCreate ? <><Icon name="user" size={18} /> {COPY.access.generate}</> : uploading ? t.uploading : flash ? t.sent : total > 1 ? t.generateN(total) : t.generate}
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

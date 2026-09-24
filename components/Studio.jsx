'use client';
import { useCallback, useEffect, useState } from 'react';
import { STUDIOS, defaultModelFor, familiesForStudio, getModel } from '@/lib/catalog';
import { getHealth, loadSettings } from '@/lib/client';
import { useJobs } from '@/lib/jobs';
import { TERMINAL } from '@/lib/schema';
import { BRAND } from '@/lib/brand';
import Composer from './Composer';
import Gallery from './Gallery';
import CharactersStudio from './CharactersStudio';
import SettingsModal from './SettingsModal';
import Explore from './Explore';

const PREFS_KEY = 'edavi.prefs';
const SOUL_BY_VERSION = { v2: 'soul-2/generate', v1: 'soul-standard/generate', cinema: 'soul-cinema/generate' };

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function writePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignorar */ }
}

function initialSeeds() {
  return Object.fromEntries(['image', 'video', 'transform'].map((s) => [s, { modelId: defaultModelFor(s).id, values: {}, nonce: 0 }]));
}

// Busca en la familia actual un modo que acepte esa entrada (p. ej. imagen a video).
function pickModelFor(studio, currentModelId, inputKey, fallbackId) {
  const current = getModel(currentModelId);
  const family = familiesForStudio(studio).find((f) => f.id === current?.familyId);
  const match = family?.models.find((m) => m.schema.properties[inputKey] && (m.schema.required || []).includes(inputKey));
  return (match || getModel(fallbackId)).id;
}

export default function Studio() {
  const [studio, setStudio] = useState('explore');
  const [seeds, setSeeds] = useState(initialSeeds);
  const [health, setHealth] = useState(null);
  const [settings, setSettings] = useState({ open: false, reason: null });
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const jobs = useJobs();
  const running = jobs.filter((j) => j.studio && !TERMINAL.has(j.status) && j.status !== 'error');

  useEffect(() => {
    const prefs = readPrefs();
    if (prefs.studio && STUDIOS.some((x) => x.id === prefs.studio)) setStudio(prefs.studio);
    if (prefs.models) {
      setSeeds((s) => {
        const next = { ...s };
        for (const [k, id] of Object.entries(prefs.models)) if (next[k] && getModel(id)?.studio === k) next[k] = { ...next[k], modelId: id, nonce: next[k].nonce + 1 };
        return next;
      });
    }
    getHealth().then(setHealth).catch(() => setHealth({ mock: false, serverCredentials: false }));
    const syncKey = () => setHasOwnKey(Boolean(loadSettings().credentials));
    syncKey();
    const onAuth = (e) => setSettings({
      open: true,
      reason: e.detail?.code === 'password' ? 'Introduce la contraseña del estudio para poder generar.' : 'Higgsfield rechazó las credenciales. Revisa tu clave.',
    });
    window.addEventListener('edavi:settings', syncKey);
    window.addEventListener('edavi:auth-required', onAuth);
    return () => {
      window.removeEventListener('edavi:settings', syncKey);
      window.removeEventListener('edavi:auth-required', onAuth);
    };
  }, []);

  useEffect(() => {
    document.title = running.length ? `(${running.length}) ${BRAND.name}` : BRAND.name;
  }, [running.length]);

  const goStudio = useCallback((id) => {
    setStudio(id);
    writePrefs({ ...readPrefs(), studio: id });
  }, []);

  const rememberModel = useCallback((studioId, modelId) => {
    const prefs = readPrefs();
    writePrefs({ ...prefs, models: { ...prefs.models, [studioId]: modelId } });
    setSeeds((s) => ({ ...s, [studioId]: { ...s[studioId], modelId } }));
  }, []);

  const plant = useCallback((studioId, modelId, values) => {
    setSeeds((s) => ({ ...s, [studioId]: { modelId, values, nonce: (s[studioId]?.nonce || 0) + 1 } }));
    goStudio(studioId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [goStudio]);

  const onReuse = useCallback((job) => {
    if (getModel(job.modelId)) plant(job.studio, job.modelId, job.payload);
  }, [plant]);

  const onUseAsInput = useCallback((output) => {
    if (output.type === 'image') {
      plant('video', pickModelFor('video', seeds.video.modelId, 'image_url', 'seedance-2-5/image-to-video'), { image_url: output.url });
    } else if (output.type === 'video') {
      plant('transform', pickModelFor('transform', seeds.transform.modelId, 'video_url', 'seedance-2-5/video-edit'), { video_url: output.url });
    }
  }, [plant, seeds]);

  const openFromExplore = useCallback((studioId, modelId, values) => {
    if (studioId === 'characters') return goStudio(studioId);
    plant(studioId, modelId || seeds[studioId].modelId, values || {});
  }, [goStudio, plant, seeds]);

  const today = new Date().toDateString();
  const spentToday = jobs
    .filter((j) => j.status === 'completed' && j.estimate && new Date(j.createdAt).toDateString() === today)
    .reduce((sum, j) => sum + Number(j.estimate.credits || 0), 0);

  const needsKey = health && !health.mock && !health.serverCredentials && !hasOwnKey;
  const current = STUDIOS.find((s) => s.id === studio);

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => goStudio('explore')} aria-label={`${BRAND.name}: inicio`}>
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">{BRAND.name}</span>
        </button>
        <nav className="studio-nav" aria-label="Estudios">
          {STUDIOS.map((s) => {
            const count = running.filter((j) => j.studio === s.id).length;
            return (
              <button type="button" key={s.id} className={`studio-tab ${studio === s.id ? 'on' : ''}`} onClick={() => goStudio(s.id)} aria-current={studio === s.id ? 'page' : undefined}>
                {s.label}
                {count > 0 && <i className="dot" title={`${count} en proceso`}>{count}</i>}
              </button>
            );
          })}
        </nav>
        <div className="topbar-actions">
          {health?.mock && <span className="badge">DEMO</span>}
          {spentToday > 0 && <span className="spent" title="Estimación de créditos usados hoy en este navegador">≈ {spentToday.toFixed(1)} cr hoy</span>}
          <button type="button" className="pill-btn" onClick={() => setSettings({ open: true, reason: null })}>Ajustes</button>
          <button type="button" className="cta small" onClick={() => openFromExplore(studio === 'explore' || studio === 'characters' ? 'image' : studio)}>Crear</button>
        </div>
      </header>

      <main className={`stage stage-${studio}`}>
        {needsKey && (
          <button type="button" className="notice notice-action" onClick={() => setSettings({ open: true, reason: null })}>
            <b>Conecta Higgsfield para empezar.</b> Añade tu clave (KEY_ID:KEY_SECRET) en Ajustes, o configura <code>HF_API_KEY_ID</code> y <code>HF_API_KEY_SECRET</code> en el servidor. →
          </button>
        )}

        {studio === 'explore' ? (
          <Explore onOpen={openFromExplore} />
        ) : (
          <>
            <header className="stage-head">
              <h1>{current.label}</h1>
              <p className="stage-blurb">{current.blurb}</p>
            </header>
            {studio === 'characters' ? (
              <CharactersStudio onUse={(c) => plant('image', SOUL_BY_VERSION[c.model_version] || SOUL_BY_VERSION.v2, { custom_reference_id: c.id })} />
            ) : (
              <div className="workspace">
                <Composer key={studio} studio={studio} seed={seeds[studio]} onModelChange={(id) => rememberModel(studio, id)} />
                <Gallery studio={studio} onReuse={onReuse} onUseAsInput={onUseAsInput} />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <span>Creado por <a href={BRAND.repo} target="_blank" rel="noreferrer"><b>{BRAND.author}</b></a></span>
        <span className="dim">Código abierto · MIT</span>
        <span className="dim">Funciona con la API de Higgsfield</span>
      </footer>

      {settings.open && <SettingsModal health={health} reason={settings.reason} onClose={() => setSettings({ open: false, reason: null })} />}
    </div>
  );
}

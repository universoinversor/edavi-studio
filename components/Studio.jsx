'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { STUDIOS, defaultModelFor, familiesForStudio, getModel } from '@/lib/catalog';
import { getHealth, loadSettings } from '@/lib/api';
import { useJobs } from '@/lib/jobs';
import { TERMINAL } from '@/lib/schema';
import { BRAND } from '@/lib/brand';
import { COPY } from '@/lib/copy';
import { applyPromptEntry } from '@/lib/plan';
import { authEnabled, useAuth } from '@/lib/auth';
import { setTheme, useTheme } from '@/lib/theme';
import { needsOnboarding, resetOnboarding } from '@/lib/onboarding';
import { toast } from '@/lib/toast';
import Composer from './Composer';
import Gallery from './Gallery';
import CharactersStudio from './CharactersStudio';
import SettingsModal from './SettingsModal';
import Explore from './Explore';
import PromptLibrary from './PromptLibrary';
import Library from './Library';
import Models from './Models';
import AdminPanel from './AdminPanel';
import RequestAccess from './RequestAccess';
import { useRole } from '@/lib/role';
import Avatar from './Avatar';
import AuthModal from './AuthModal';
import AccountMenu from './AccountMenu';
import Onboarding from './Onboarding';
import Toasts from './Toasts';
import ErrorBoundary from './ErrorBoundary';
import { useOnline } from '@/lib/mascot';
import Logo from './Logo';
import Icon from './Icon';
import Portal from './Portal';

const t = COPY.app;
const PREFS_KEY = 'edavi.prefs';
const SOUL_BY_VERSION = { v2: 'soul-2/generate', v1: 'soul-standard/generate', cinema: 'soul-cinema/generate' };
const ROUTES = STUDIOS.map((s) => s.id);
// Barra lateral (escritorio): secciones agrupadas como una consola.
/** @type {Array<[string, string[]]>} */
const SIDEBAR_GROUPS = [['main', ['explore', 'models']], ['create', ['image', 'video', 'transform', 'characters']], ['resources', ['prompts', 'library']], ['manage', ['admin']]];
// Móvil: máximo 5 destinos; el resto va en «Más».
const MOBILE_MAIN = ['explore', 'image', 'video', 'prompts'];

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

const NAV_ICONS = {
  explore: <><path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /></>,
  models: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9.5" cy="10" r="1.6" /><path d="m5 17 4.5-4.5 3.5 3.5 2.5-2.5L19 17" /></>,
  video: <><rect x="3.5" y="6" width="12" height="12" rx="3" /><path d="m15.5 10.5 5-3v9l-5-3" /></>,
  transform: <><path d="M4 8h12l-3-3M20 16H8l3 3" /></>,
  characters: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  prompts: <><path d="M5 4h11l3 3v13H5z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  admin: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  library: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
};

function NavIcon({ id }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden>{NAV_ICONS[id]}</svg>;
}

export default function Studio() {
  const [studio, setStudio] = useState('explore');
  const [seeds, setSeeds] = useState(initialSeeds);
  const [health, setHealth] = useState(null);
  const [settings, setSettings] = useState({ open: false, reason: null });
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [auth, setAuth] = useState(null); // { mode, reason } o null
  const [more, setMore] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { isAdmin, role, ready: roleReady } = useRole();
  const guest = authEnabled && roleReady && !isAdmin;
  const { session } = useAuth();
  const theme = useTheme();
  const online = useOnline();
  const jobs = useJobs();
  const running = jobs.filter((j) => j.studio && !TERMINAL.has(j.status) && j.status !== 'error');

  useEffect(() => {
    const prefs = readPrefs();
    const fromHash = window.location.hash.slice(1);
    if (ROUTES.includes(fromHash)) setStudio(fromHash);
    else if (prefs.studio && ROUTES.includes(prefs.studio)) setStudio(prefs.studio);
    // Botón «Atrás» del navegador / teléfono entre secciones.
    const onPop = () => {
      const id = window.location.hash.slice(1) || 'explore';
      if (ROUTES.includes(id)) setStudio(id);
    };
    if (prefs.models) {
      setSeeds((s) => {
        const next = { ...s };
        for (const [k, id] of Object.entries(prefs.models)) if (next[k] && getModel(id)?.studio === k) next[k] = { ...next[k], modelId: id, nonce: next[k].nonce + 1 };
        return next;
      });
    }
    getHealth().then(setHealth).catch(() => setHealth({ mock: false, serverCredentials: false }));
    if (needsOnboarding()) setOnboarding(true);
    const syncKey = () => setHasOwnKey(Boolean(loadSettings().credentials));
    syncKey();
    const onAuthRequired = (e) => {
      if (e.detail?.code === 'login') { setAuth({ mode: 'signin', reason: COPY.auth.required }); return; }
      setSettings({ open: true, reason: e.detail?.code === 'password' ? COPY.errors.password : COPY.errors.badCredentials });
    };
    const onRecovery = () => setAuth({ mode: 'recovery' });
    const onRequest = () => { setAuth(null); setRequesting(true); };
    window.addEventListener('edavi:request-access', onRequest);
    window.addEventListener('popstate', onPop);
    window.addEventListener('edavi:settings', syncKey);
    window.addEventListener('edavi:auth-required', onAuthRequired);
    window.addEventListener('edavi:password-recovery', onRecovery);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('edavi:settings', syncKey);
      window.removeEventListener('edavi:auth-required', onAuthRequired);
      window.removeEventListener('edavi:password-recovery', onRecovery);
      window.removeEventListener('edavi:request-access', onRequest);
    };
  }, []);

  // Aviso cuando termina una generación, con acceso directo a su estudio.
  useEffect(() => {
    const onFinished = (e) => {
      const { status, family, studio: where } = e.detail || {};
      if (status === 'canceled') return;
      const ok = status === 'completed';
      toast(ok ? COPY.toasts.done(family) : COPY.toasts.failed(family), {
        tone: ok ? 'success' : 'error',
        action: { label: COPY.toasts.view, onClick: () => goStudioRef.current?.(where) },
      });
    };
    window.addEventListener('edavi:job-finished', onFinished);
    return () => window.removeEventListener('edavi:job-finished', onFinished);
  }, []);

  useEffect(() => {
    document.title = running.length ? `(${running.length}) ${BRAND.name}` : BRAND.name;
  }, [running.length]);

  const goStudio = useCallback((id) => {
    if (!ROUTES.includes(id)) return;
    setStudio(id);
    setMore(false);
    writePrefs({ ...readPrefs(), studio: id });
    // Cada sección tiene su propia URL: se puede compartir y «Atrás» funciona.
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    // Tras cambiar de sección, el foco va al contenido (lectores de pantalla).
    requestAnimationFrame(() => document.getElementById('contenido')?.focus({ preventScroll: true }));
  }, []);

  const goStudioRef = useRef(goStudio);
  goStudioRef.current = goStudio;

  const rememberModel = useCallback((studioId, modelId) => {
    const prefs = readPrefs();
    writePrefs({ ...prefs, models: { ...prefs.models, [studioId]: modelId } });
    setSeeds((s) => ({ ...s, [studioId]: { ...s[studioId], modelId } }));
  }, []);

  const plant = useCallback((studioId, modelId, values) => {
    // «explicit»: acción del usuario (reusar, animar, prompt…): manda sobre el borrador guardado.
    setSeeds((s) => ({ ...s, [studioId]: { modelId, values, explicit: true, at: Date.now(), nonce: (s[studioId]?.nonce || 0) + 1 } }));
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

  // Abre una sección; si es un estudio de creación, con modelo y valores opcionales.
  const open = useCallback((studioId, modelId, values) => {
    if (!seeds[studioId]) return goStudio(studioId);
    plant(studioId, modelId || seeds[studioId].modelId, values || {});
  }, [goStudio, plant, seeds]);

  const finishOnboarding = useCallback((destination) => {
    setOnboarding(false);
    if (destination) open(destination);
  }, [open]);

  const today = new Date().toDateString();
  const jobsToday = jobs.filter((j) => new Date(j.createdAt).toDateString() === today);
  const spentToday = jobsToday
    .filter((j) => j.status === 'completed' && j.estimate)
    .reduce((sum, j) => sum + Number(j.estimate.credits || 0), 0);

  const tabButton = (s) => {
    const count = running.filter((j) => j.studio === s.id).length;
    return (
      <button type="button" key={s.id} className={`studio-tab ${studio === s.id ? 'on' : ''}`} onClick={() => goStudio(s.id)} aria-current={studio === s.id ? 'page' : undefined}>
        <NavIcon id={s.id} />
        <span className="tab-label">{s.label}</span>
        {count > 0 && <i className="dot" title={t.running(count)}>{count}</i>}
      </button>
    );
  };

  const canManage = authEnabled && isAdmin;
  const visibleStudios = STUDIOS.filter((s) => s.id !== 'admin' || canManage);
  const inMore = !MOBILE_MAIN.includes(studio);
  const moreRunning = running.filter((j) => !MOBILE_MAIN.includes(j.studio)).length;
  const needsKey = health && !health.mock && !health.loginRequired && !health.serverCredentials && !hasOwnKey;
  const current = STUDIOS.find((s) => s.id === studio) || STUDIOS[0];
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const openSettings = () => setSettings({ open: true, reason: null });

  return (
    <div className="app">
      <a className="skip-link" href="#contenido">{t.skip}</a>
      <aside className="sidebar" aria-label={t.sidebar.label}>
        <button type="button" className="brand" onClick={() => goStudio('explore')} aria-label={t.home}>
          <Logo />
        </button>
        <nav className="side-nav" aria-label={t.navLabel}>
          {SIDEBAR_GROUPS.filter(([group]) => group !== 'manage' || canManage).map(([group, ids]) => (
            <div className="side-group" key={group}>
              <p className="side-group-label">{t.sidebar.groups[group]}</p>
              {ids.map((id) => {
                const s = STUDIOS.find((x) => x.id === id);
                const count = running.filter((j) => j.studio === id).length;
                return (
                  <button type="button" key={id} className={`side-link ${studio === id ? 'on' : ''}`} onClick={() => goStudio(id)} aria-current={studio === id ? 'page' : undefined}>
                    <NavIcon id={id} />
                    <span>{s.label}</span>
                    {count > 0 && <i className="dot" title={t.running(count)}>{count}</i>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {guest ? (
          <div className="side-card">
            <div className="side-card-head">
              <Avatar size="sm" mood="idle" />
              <span className="mono">{t.sidebar.guestKicker}</span>
            </div>
            <p><span className="dim">{t.sidebar.guestText}</span></p>
            <button type="button" className="cta small" onClick={() => setRequesting(true)}><Icon name="user" size={16} /> {t.sidebar.requestCta}</button>
          </div>
        ) : (
        <div className="side-card">
          <div className="side-card-head">
            <Avatar size="sm" mood={running.length ? 'thinking' : 'idle'} />
            <span className="mono">{t.sidebar.cardKicker}</span>
          </div>
          <p><b>{t.sidebar.cardGenerations(jobsToday.length)}</b><span className="dim">{t.sidebar.cardSpent(spentToday.toFixed(1))}</span></p>
          <button type="button" className="cta small" onClick={() => open(seeds[studio] ? studio : 'image')}><Icon name="sparkles" size={16} /> {t.sidebar.cardCta}</button>
        </div>
        )}
      </aside>
      <header className="topbar">
        <button type="button" className="brand" onClick={() => goStudio('explore')} aria-label={t.home}>
          <Logo />
        </button>
        <nav className="studio-nav" aria-label={t.navLabel}>{visibleStudios.map(tabButton)}</nav>
        <div className="topbar-title">
          <b>{current.label}</b>
          <span className="dim">{current.blurb}</span>
        </div>
        <div className="topbar-actions">
          {health?.mock && <span className="badge">{t.demo}</span>}
          {spentToday > 0 && <span className="spent" title={t.spentTodayHint}>{t.spentToday(spentToday.toFixed(1))}</span>}
          <button type="button" className="pill-btn theme-toggle" onClick={toggleTheme}
            aria-label={theme === 'light' ? t.themeToDark : t.themeToLight} title={theme === 'light' ? t.themeDark : t.themeLight}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <button type="button" className="pill-btn settings-btn" onClick={openSettings} aria-label={t.settings}>
            <Icon name="settings" className="settings-icon" /><span className="tab-label">{t.settings}</span>
          </button>
          {authEnabled && (session ? (
            <AccountMenu email={session.user.email} onLibrary={() => goStudio('library')}
              onOnboarding={() => { resetOnboarding(); setOnboarding(true); }} onSettings={openSettings} />
          ) : (
            <button type="button" className="pill-btn" onClick={() => setAuth({ mode: 'signin' })}>{COPY.account.signIn}</button>
          ))}
          {guest
            ? <button type="button" className="cta small" onClick={() => setRequesting(true)}>{t.sidebar.requestCta}</button>
            : <button type="button" className="cta small" onClick={() => open(seeds[studio] ? studio : 'image')}>{t.create}</button>}
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className={`stage stage-${studio}`}>
        {guest && ['image', 'video', 'transform', 'characters'].includes(studio) && (
          <button type="button" className="notice notice-action" onClick={() => setRequesting(true)}>
            <b>{COPY.access[role === 'member' ? 'member' : 'guest'][0]}</b> {COPY.access[role === 'member' ? 'member' : 'guest'][1]} <Icon name="arrowRight" size={16} />
          </button>
        )}
        {needsKey && (
          <button type="button" className="notice notice-action" onClick={openSettings}>
            <b>{t.notices.key[0]}</b> {t.notices.key[1]} <Icon name="arrowRight" size={16} />
          </button>
        )}

        {!online && (
          <p className="notice notice-offline" role="status"><Icon name="wifiOff" size={18} /> {t.notices.offline}</p>
        )}

        <ErrorBoundary resetKey={studio}>
        {studio === 'explore' ? (
          <Explore onOpen={open} showcase={!isAdmin && authEnabled} />
        ) : studio === 'models' ? (
          <Models onOpen={open} />
        ) : studio === 'admin' ? (
          <AdminPanel health={health} />
        ) : studio === 'library' ? (
          <Library onReuse={onReuse} onCreate={() => open('image')} />
        ) : studio === 'prompts' ? (
          <PromptLibrary page onUse={(entry, kind) => {
            const model = getModel(seeds[kind].modelId);
            plant(kind, model.id, applyPromptEntry(model, {}, entry));
          }} />
        ) : (
          <>
            <h1 className="sr-only">{current.label}</h1>
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
        </ErrorBoundary>
      </main>

      <nav className="studio-nav mobile-nav" aria-label={t.mobileNavLabel}>
        {STUDIOS.filter((s) => MOBILE_MAIN.includes(s.id)).map(tabButton)}
        <button type="button" className={`studio-tab ${inMore ? 'on' : ''}`} onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more}>
          <Icon name="more" size={20} />
          <span className="tab-label">{t.more}</span>
          {moreRunning > 0 && <i className="dot">{moreRunning}</i>}
        </button>
      </nav>
      {more && (
        <Portal>
          <div className="sheet-backdrop more-backdrop" onClick={() => setMore(false)}>
            <div className="sheet more-sheet" role="dialog" aria-modal="true" aria-label={t.moreTitle} onClick={(e) => e.stopPropagation()}>
              <span className="grabber" aria-hidden />
              {visibleStudios.filter((s) => !MOBILE_MAIN.includes(s.id)).map((s) => (
                <button type="button" key={s.id} className={`more-row ${studio === s.id ? 'on' : ''}`} onClick={() => goStudio(s.id)}>
                  <NavIcon id={s.id} /><span><b>{s.label}</b><em>{s.blurb}</em></span>
                </button>
              ))}
              <button type="button" className="more-row" onClick={toggleTheme}>
                <Icon name={theme === 'light' ? 'moon' : 'sun'} size={20} /><span><b>{theme === 'light' ? t.themeDark : t.themeLight}</b><em>{t.themeHint}</em></span>
              </button>
              <button type="button" className="more-row" onClick={() => { setMore(false); openSettings(); }}>
                <Icon name="settings" size={20} /><span><b>{t.settings}</b><em>{t.settingsHint}</em></span>
              </button>
            </div>
          </div>
        </Portal>
      )}

      <footer className="site-footer">
        <span>{t.footer.by} <a href={BRAND.repo} target="_blank" rel="noreferrer"><b>{BRAND.author}</b></a></span>
        <span className="dim">{t.footer.license}</span>
        <span className="dim">{t.footer.powered}</span>
      </footer>

      <Toasts />
      {onboarding && <Onboarding onFinish={finishOnboarding} />}
      {auth && <AuthModal mode={auth.mode} reason={auth.reason} allowSignup={Boolean(health?.allowSignup)} onClose={() => setAuth(null)} />}
      {requesting && <RequestAccess onClose={() => setRequesting(false)} />}
      {settings.open && <SettingsModal health={health} reason={settings.reason} onClose={() => setSettings({ open: false, reason: null })} />}
    </div>
  );
}

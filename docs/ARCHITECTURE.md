# Arquitectura de EDAVI Studio

Mapa del sistema al empezar el brief de 6 fases (2026-09-25) y la forma que tiene después.

## 1. Rutas

La app es una sola página de Next.js 15 (App Router). La navegación entre secciones usa el hash de la URL.

| Ruta | Qué es |
| --- | --- |
| `/` | Shell de la app (`components/Studio.jsx`) |
| `/#explore` · `#image` · `#video` · `#transform` · `#characters` · `#prompts` · `#library` | Secciones. Se pueden compartir y funcionan con «Atrás» |
| `POST/GET /api/hf/[...path]` | Proxy hacia el proveedor de generación, con lista blanca de rutas |
| `POST /api/upload` | Subida de respaldo a través del servidor |
| `POST /api/archive` | Copia los resultados a Supabase Storage |
| `GET /api/health` | Configuración pública: modo demo, login, claves del servidor |
| `GET /api/mock-media/[id]` | Solo en modo demo |

## 2. Estado (cliente)

Todos los almacenes son externos a React y se leen con `useSyncExternalStore`.

| Almacén | Archivo | Persistencia |
| --- | --- | --- |
| Trabajos de generación | `lib/jobs.js` | `localStorage` + Supabase (`edavi_generations`) |
| Personajes Soul ID | `lib/characters.js` | `localStorage` + Supabase (`edavi_characters`) |
| Sesión | `lib/auth.js` | Supabase Auth (`localStorage` `edavi.auth`) |
| Tema | `lib/theme.js` | `localStorage` `edavi.theme` |
| Preferencias y borradores | `components/Studio.jsx`, `lib/drafts.js` | `localStorage` |
| Onboarding | `lib/onboarding.js` | `localStorage` |
| Avisos (toasts) | `lib/toast.js` | Memoria |

## 3. Autenticación y permisos

- **Cliente:** Supabase Auth con email y contraseña (`lib/auth.js`). El token viaja como `Authorization: Bearer` hacia el propio servidor.
- **Servidor:** `lib/server/session.js` valida el token contra `/auth/v1/user` y lo guarda 60 s en caché.
- **Reglas** (`lib/server/hf.js → resolveAuth`):
  - Con Supabase configurado hay que iniciar sesión.
  - Solo `ADMIN_EMAILS` usan la clave del servidor.
  - El resto de usuarios puede usar su propia clave solo si `ALLOW_OWN_KEYS=1`.
  - Sin Supabase: se usa la clave propia del usuario o `STUDIO_PASSWORD`.
- **Secretos:** `HF_API_KEY_ID`/`HF_API_KEY_SECRET` solo existen en el servidor. Al navegador solo llegan la URL y la clave publicable de Supabase.

## 4. Persistencia

Supabase, dentro del proyecto veryx. Tablas `edavi_*` con RLS y el bucket `edavi-media`; los scripts están en `supabase/`.

## 5. Proveedores detrás de adaptadores

```
components ──► lib/providers/index.js  (fachada estable para la UI)
                  ├─ generation: lib/providers/generation/higgsfield.client.js  → /api/hf (proxy)
                  ├─ storage:    lib/providers/storage/supabase.client.js      → Supabase (RLS)
                  └─ prompts:    lib/providers/prompts/*.js                    → banco local / MeiGen

app/api/*  ──► lib/server/providers/index.js
                  ├─ higgsfield.js  (URL base, cabecera de auth, rutas permitidas, forward)
                  └─ mock.js        (modo demo)
```

La UI nunca importa un SDK ni una URL de proveedor. Para cambiar de proveedor de generación se escribe otro adaptador con la misma interfaz (`submit`, `status`, `cancel`, `estimate`, `upload`, `listStyles`, `listPresets`, `createCharacter`, `getCharacter`) y se registra en `lib/server/providers/index.js`.

## 6. Textos de producto

Todos los textos visibles viven en `lib/copy.js`. La marca (nombre, autor, repositorio y avatar) está en `lib/brand.js`.

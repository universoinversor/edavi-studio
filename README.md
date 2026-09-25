# EDAVI Studio

**Estudio creativo de imagen y video con IA, conectado a la [API de Higgsfield](https://docs.higgsfield.ai/docs).**
Creado por **EDAVI**. Código abierto, en español, listo para conectar tu clave y crear.

> Si usas, copias o publicas este proyecto (o una versión modificada), **debes dar crédito a EDAVI**. Consulta [Crédito y licencia](#crédito-y-licencia).

---

## Qué puedes hacer

**81 modelos de Higgsfield en un solo lugar:** SOUL V2, SOUL Cinema, Soul ID, Seedance 2.0/2.5, Kling 2.5/2.6/3.0/O3/Omni, Motion Control, Wan 2.6/2.7/3.0, MiniMax H3, Hailuo, LTX-2.5, PixVerse V6, Cinema Studio 4.0, Genjutsu, Recraft, Qwen Image 3, Ideogram 4, Grok, Z-Image y Marketing Studio.

| Estudio | Para qué sirve |
| --- | --- |
| **Explorar** | Portada con destacados, catálogo filtrable de modelos y galería de tus creaciones |
| **Imagen** | Retratos, producto, carteles y edición con referencias |
| **Video** | De texto, imagen o referencias a video, con audio nativo |
| **Transformar** | Editar, extender o transferir movimiento a un video |
| **Personajes** | Entrenar un Soul ID con tus fotos y usarlo en SOUL |
| **Prompts** | Biblioteca de más de 1.500 prompts listos para usar en cualquier estudio |

### Lo que añade EDAVI encima de la API

- **💰 Costo en vivo:** antes de generar ves cuántos créditos y dólares costará, con el endpoint oficial `/estimate`.
- **🎲 Variaciones ×1–×4:** varias versiones de un mismo prompt; cada una recibe una semilla distinta automáticamente.
- **⚖️ Comparar modelos:** el mismo prompt en hasta 4 modelos a la vez; solo aparecen los compatibles con lo que ya rellenaste.
- **🔗 Flujos automáticos:** «animar al terminar». Generas una imagen y, cuando está lista, se envía sola a un modelo de video.
- **📚 Biblioteca de prompts (más de 1.500):**
  - **1.446 prompts de imagen** de la comunidad [MeiGen](https://github.com/jau123/MeiGen-AI-Design-MCP), con categorías, plantillas con [HUECOS] resaltados, autor y enlace al ejemplo original.
  - **58 prompts de video** originales de EDAVI, por categorías (cine, producto, moda, naturaleza, acción, VFX, comida, redes, arquitectura, animación). Incluyen storyboards de varias tomas para Kling y presets de cámara para Cinema Studio.
  - **22 prompts de transformación**: cambios de estilo, ropa, escenario, clima y movimiento.
  - Consejos específicos para cada modelo y «Sorpréndeme» para elegir uno al azar.
- **⭐ Historial inteligente:** favoritos, búsqueda, créditos gastados hoy, «Reusar», «Animar →» y «Transformar →».
- **🧠 Formularios automáticos:** cada modelo dibuja sus controles a partir de su JSON Schema oficial y se valida en español antes de gastar créditos.
- **🔁 Cola resistente:** sigue cada trabajo con backoff, se reanuda si recargas y, si llegas al límite de concurrencia, reenvía cuando hay hueco.
- **📤 Subidas fáciles:** arrastra archivos; las imágenes en formatos no admitidos se convierten solas a PNG.
- **🔒 Seguro:** tus claves viven en el servidor, el proxy solo permite rutas conocidas y puedes protegerlo con contraseña.
- **🌗 Tema claro y oscuro:** oscuro morado con cristal, o claro marfil con dorado metálico. Se recuerda en cada navegador.
- **🤖 Avatar EDAVI:** la mascota de la marca en la portada, en el inicio de sesión y en los estados vacíos (`public/edavi-avatar.png`).
- **🧭 Consola estilo Higgsfield:** barra lateral, panel con saludo y métricas del día, y explorador de todos los modelos con buscador, filtros y orden.
- **📱 Móvil tipo app:** barra de navegación inferior con iconos.
- **🧪 Modo demo:** prueba toda la interfaz sin gastar créditos.

## Empezar en 3 pasos

Necesitas Node.js 20 o superior y una cuenta en [console.higgsfield.ai](https://console.higgsfield.ai).

```bash
git clone https://github.com/universoinversor/edavi-studio.git
cd edavi-studio
npm install
```

1. Copia `.env.example` a `.env.local`.
2. Pega tu clave de Higgsfield en `HF_API_KEY_ID` y `HF_API_KEY_SECRET`.
3. Ejecuta `npm run dev` y abre http://localhost:3000.

¿Sin clave todavía? Prueba el modo demo:

```bash
npm run dev:mock
```

En modo demo, un prompt que contenga la palabra `fail` simula una generación fallida.

## Configuración (`.env.local`)

| Variable | Para qué sirve |
| --- | --- |
| `HF_API_KEY_ID` / `HF_API_KEY_SECRET` | Tu clave de Higgsfield. Solo se usa en el servidor. |
| `STUDIO_PASSWORD` | Opcional. Si publicas la app con tus claves, exige esta contraseña para generar. **Muy recomendable.** |
| `HF_MOCK` | `1` activa el modo demo. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Opcional. Login, historial en la nube y archivos permanentes (ejecuta `supabase/edavi_install.sql`). |
| `ADMIN_EMAILS` | Emails que generan con la clave del servidor. |
| `ALLOW_OWN_KEYS` | `1` deja generar a usuarios con sesión usando su propia clave. |
| `NEXT_PUBLIC_ALLOW_SIGNUP` | `1` muestra «Crear cuenta» en el login. |
| `NEXT_PUBLIC_SITE_URL` | URL pública para Open Graph y enlaces de recuperación. |

Si el servidor no tiene claves, cada persona puede poner la suya en **Ajustes** (`KEY_ID:KEY_SECRET`). Esa clave se guarda solo en su navegador.

## Publicar en Vercel

1. Importa el repositorio en [vercel.com/new](https://vercel.com/new).
2. Añade `HF_API_KEY_ID`, `HF_API_KEY_SECRET` y `STUDIO_PASSWORD` en *Settings → Environment Variables*.
3. Despliega.

## Mantenerlo al día

Cuando Higgsfield publique modelos nuevos o cambie parámetros:

```bash
npm run sync:catalog   # regenera lib/catalog.json desde la documentación de cada modelo (dash.higgsfield.ai)
npm test               # comprueba que todo sigue funcionando
npm run typecheck      # verificación de tipos (JSDoc + checkJs)
```

## Personalizar la marca

- Nombre, autor y enlace: `lib/brand.js`
- Colores: tema oscuro en `app/glass.css` y tema claro (blanco + dorado) en `app/theme.css`
- Avatar: reemplaza `public/edavi-avatar.png` (PNG transparente, cuadrado, 1024 px recomendado)
- Icono: `public/icon.svg`
- Banners y modelos destacados: `components/Explore.jsx` y `FEATURED` en `lib/catalog.js`
- Prompts de video y transformación, y consejos por modelo: `lib/prompt-bank.js`
- Banco de prompts de imagen: `npm run import:prompts` (actualiza `public/prompts/meigen.json` desde MeiGen)

## Estructura

```
app/api/gen/[...path]  Proxy seguro hacia el proveedor de generación (lista blanca de rutas)
lib/copy.js            Todos los textos de la interfaz
lib/brand.js           Marca: nombre, colores, avatar
lib/providers/         Adaptadores del cliente (generación, almacenamiento)
lib/server/providers/  Adaptadores del servidor (Higgsfield, demo, Supabase Storage)
lib/catalog.json       Catálogo generado: endpoint + JSON Schema de cada modelo
lib/schema.js          Schema → controles, payload y validación
lib/plan.js            Variaciones, comparación, flujos e inspiración
lib/jobs.js            Cola de generaciones, polling, flujos y reintentos
components/            Interfaz: Explorar, estudios, formularios y galería
scripts/sync-catalog   Sincroniza el catálogo con la documentación de Higgsfield
tests/                 Pruebas (npm test)
docs/                  Arquitectura, design system y QA
```

## Crédito y licencia

**© 2026 EDAVI.** Publicado bajo la [licencia MIT](LICENSE).

Puedes usarlo, modificarlo y distribuirlo, **siempre que conserves el aviso de copyright de EDAVI** del archivo `LICENSE` en todas las copias. Así lo exige la licencia MIT.

Además, te pedimos que:

- mantengas visible el crédito «Creado por EDAVI» del pie de la app, o lo menciones en tu README, y
- enlaces a este repositorio: https://github.com/universoinversor/edavi-studio

Consulta [NOTICE](NOTICE) para el texto de atribución sugerido.

Los prompts de imagen provienen de [MeiGen AI Design MCP](https://github.com/jau123/MeiGen-AI-Design-MCP) (MIT, © 2026 MeiGen) y fueron creados por sus respectivos autores, enlazados en cada tarjeta.

Basado en [Open Generative AI](https://github.com/Anil-matcha/Open-Generative-AI) (MIT, © Open Generative AI Contributors). EDAVI Studio es un proyecto independiente: no está afiliado a Higgsfield. «Higgsfield» y los nombres de los modelos pertenecen a sus respectivos dueños.

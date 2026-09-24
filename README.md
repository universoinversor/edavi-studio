# EDAVI Studio

Estudio de generación de **imagen y video con IA** conectado a la [API de Higgsfield](https://docs.higgsfield.ai/docs).
Tiene 81 endpoints de generación (SOUL, Seedance, Kling, Wan, MiniMax, LTX, PixVerse, Recraft, Qwen, Ideogram, Grok, Cinema Studio y otros) y el entrenamiento de personajes Soul ID.

## Qué incluye

- **4 estudios**: Imagen, Video, Transformar (editar, extender o transferir movimiento) y Personajes (Soul ID).
- **Formularios automáticos**: cada modelo pinta sus controles a partir de su JSON Schema oficial. Así nunca se envía un parámetro que el modelo no acepte.
- **Validación previa** en español, con las reglas condicionales de cada modelo (por ejemplo, las tomas múltiples de Kling, las referencias de Seedance o los presets de Marketing Studio).
- **Subida de archivos** mediante URL prefirmada de Higgsfield. Si el navegador no puede subir directamente, la subida pasa por tu servidor. Las imágenes en formatos no admitidos se convierten a PNG automáticamente.
- **Cola inteligente**: sigue cada trabajo con backoff (de 2 s hasta 10 s), se reanuda si recargas la página y, cuando alcanzas el límite de concurrencia de tu cuenta, reenvía el trabajo en cuanto termina otro.
- **Hoja de contactos**: historial local con descarga, vista ampliada, cancelar, «Reusar» (recupera modelo y parámetros), «Animar →» (de imagen a video) y «Transformar →» (de video a edición).
- **Seguridad**: las credenciales viven en el servidor, como exige Higgsfield. El proxy solo deja pasar rutas conocidas y puedes protegerlo con una contraseña.
- **Modo demo** para probar toda la interfaz sin gastar créditos.

## Puesta en marcha

Necesitas Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # y rellena tus claves
npm run dev                  # http://localhost:3000
```

Para probar sin claves y sin gastar créditos:

```bash
npm run dev:mock
```

En modo demo, un prompt que contenga la palabra `fail` simula una generación fallida.

## Configuración (`.env.local`)

| Variable | Para qué sirve |
| --- | --- |
| `HF_API_KEY_ID` / `HF_API_KEY_SECRET` | Tu clave de [console.higgsfield.ai](https://console.higgsfield.ai). Solo se usa en el servidor. |
| `STUDIO_PASSWORD` | Opcional. Si publicas la app con tus claves, pide esta contraseña antes de generar. **Muy recomendable.** |
| `HF_MOCK` | `1` activa el modo demo. |

Si no configuras claves en el servidor, cada persona puede poner la suya en **Ajustes** con el formato `KEY_ID:KEY_SECRET`. Esa clave se guarda solo en su navegador y viaja a tu servidor, que la reenvía a Higgsfield.

## Publicar en Vercel

1. Sube el repositorio a GitHub e impórtalo en [vercel.com/new](https://vercel.com/new).
2. En *Settings → Environment Variables*, añade `HF_API_KEY_ID`, `HF_API_KEY_SECRET` y `STUDIO_PASSWORD`.
3. Despliega. No hace falta configurar nada más.

> En Vercel, la ruta de respaldo `/api/upload` acepta archivos de hasta unos 4,5 MB. La subida directa del navegador a Higgsfield no tiene ese límite.

## Actualizar los modelos

Cuando Higgsfield publique modelos nuevos o cambie sus parámetros:

```bash
npm run sync:catalog   # regenera lib/catalog.json desde la documentación oficial
npm test               # comprueba que todos los campos tienen control
```

## Personalizar la marca

- Nombre y lema: `lib/brand.js`
- Colores, tipografías y estilo: variables al inicio de `app/globals.css`
- Icono: `public/icon.svg`
- Descripciones de los modelos en español: `lib/descriptions.es.js`

## Estructura

```
app/api/hf/[...path]   Proxy seguro hacia api.higgsfield.ai (lista blanca de rutas)
app/api/upload         Subida de respaldo por el servidor
lib/catalog.json       Catálogo generado: endpoint + JSON Schema de cada modelo
lib/schema.js          Schema → controles, payload y validación (con pruebas)
lib/jobs.js            Cola de generaciones, polling y reintentos
components/            Interfaz: estudios, formularios, galería y ajustes
scripts/sync-catalog   Sincroniza el catálogo con la documentación de Higgsfield
```

## Licencia y créditos

MIT. Proyecto basado en [Open Generative AI](https://github.com/Anil-matcha/Open-Generative-AI) (MIT, © Open Generative AI Contributors), rediseñado y reescrito para la API de Higgsfield. «Higgsfield» y los nombres de los modelos pertenecen a sus respectivos dueños; este proyecto no está afiliado a Higgsfield.

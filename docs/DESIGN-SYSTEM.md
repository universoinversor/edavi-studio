# Design system de EDAVI Studio

## Capas de estilo (en orden de carga)

| Archivo | Qué contiene |
| --- | --- |
| `app/tokens.css` | Escalas independientes del tema: espaciado, radios, tipografía, capas, movimiento y tamaño táctil |
| `app/globals.css` | Base y componentes originales |
| `app/glass.css` | **Tema oscuro** (morado + cristal): colores en variables `--*-rgb`, `--accent`, `--glass`… |
| `app/tool.css` | Distribución de los estudios: panel izquierdo y resultados |
| `app/prompts.css` | Biblioteca de prompts |
| `app/hero.css` | Portada, avatar y navegación móvil |
| `app/theme.css` | **Tema claro** (marfil + dorado metálico) con `[data-theme='light']` |
| `app/polish.css` | Accesibilidad: objetivos de 44 px, contraste, foco y respuesta al tocar |
| `app/system.css` | Componentes del brief: toasts, onboarding, biblioteca, avatar con estados, auth |

## Tokens de color (cambian con el tema)

| Token | Oscuro | Claro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#07060b` | `#f4f2ec` | Fondo de la página |
| `--text` | `#f5f3f9` | `#14120e` | Texto principal (≥ 4.5:1) |
| `--muted` | `#9a94a8` | `#6b6760` | Texto secundario |
| `--faint` | `#8a8398` | `#6f6a61` | Metadatos (≥ 4.5:1) |
| `--accent` | `#8f4dff` | `#b8892a` | Acción principal |
| `--accent-hi` | `#b98cff` | `#8a6b16` | Texto de acento y énfasis |
| `--a-rgb` / `--a2-rgb` | morado | oro | Transparencias de acento |
| `--ink-rgb` | blanco | tinta | Superposiciones sobre el fondo |
| `--danger` / `--ok` | rojo / verde | rojo / verde | Estados (siempre con icono o texto) |
| `--glass`, `--glass-edge`, `--glass-shadow` | — | — | Superficies de cristal |
| `--brand-grad` | morado | oro metálico | Texto con brillo (`.shine`) |

Reglas:

- Nunca uses hex sueltos en componentes: usa tokens.
- Todo color nuevo necesita su valor para los dos temas.

## Tipografía

- **Anton** (`--font-display`): titulares en mayúsculas.
- **Geist** (`--font-body`): interfaz y texto.
- **Geist Mono** (`--font-mono`): cifras y metadatos, con `tabular-nums`.

Escala: `--fs-xs` 12 · `--fs-sm` 14 · `--fs-md` 16 · `--fs-lg` 20 · `--fs-xl` 24 · `--fs-2xl` 32 · `--fs-3xl` 48 · `--fs-4xl` 72. El mínimo es 11.5 px, y 16 px en campos táctiles.

## Componentes base

| Clase | Uso |
| --- | --- |
| `.cta` | Acción principal: una por pantalla |
| `.generate` | Botón de enviar del compositor |
| `.pill-btn`, `.ghost-btn` | Acciones secundarias |
| `.icon-btn` | Solo icono; necesita `aria-label` |
| `.chip` (`.on`) | Opciones de selección |
| `.row-card` | Fila de ajuste (Modelo ›, Cantidad) |
| `.field-wrap` | Tarjeta de campo con etiqueta visible |
| `.sheet` / `.sheet-backdrop` | Modales. Se cierran con Esc y haciendo clic fuera |
| `.toast` | Avisos (`aria-live="polite"`) |
| `<Icon name>` | Iconos SVG de trazo 1.8. No uses emojis |
| `<Avatar mood>` | Mascota con estado: `idle`, `thinking`, `success`, `error`, `empty`, `offline` |
| `<Logo>` | Isotipo + nombre |

## Movimiento

- Microinteracciones: `--dur-fast` (150 ms). Entradas: `--dur-base` (220 ms). Hojas y modales: `--dur-slow` (320 ms).
- Al pulsar: `scale(0.96)`.
- Todo respeta `prefers-reduced-motion`.

## Accesibilidad

- Objetivos táctiles de 44 px (`--touch-min`) cuando el puntero es táctil.
- Foco visible en todos los controles.
- Enlace «Saltar al contenido».
- Los modales atrapan el foco y lo devuelven al cerrarse.
- Los errores usan `role="alert"`.

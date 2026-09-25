# QA · Fase 6

Evidencia de la última verificación (rama `brief-fases`, modo demo `npm run dev:mock`).

## Comprobaciones automáticas

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Pruebas | `npm test` | 21 / 21 OK |
| Tipos | `npm run typecheck` | 0 errores (partimos de 119) |
| Build de producción | `NEXT_DIST_DIR=.next-prod npx next build` | OK · `/` 121 kB (232 kB first load) |

## Accesibilidad (axe-core 4.10, reglas WCAG 2 A + AA)

- 7 rutas (Explorar, Imagen, Video, Transformar, Personajes, Prompts, Biblioteca) × 2 temas: **0 violaciones**.
- Diálogo de acceso: `aria-modal`, título enlazado, foco inicial en el email, trampa de foco, cierre con Esc, foco devuelto al botón que lo abrió, scroll del fondo bloqueado. **0 violaciones**.
- Corregido en esta fase:
  - Contraste del dorado en el tema claro: `--accent-hi` pasa de `#8a6b16` a `#7a5e12` (4,39 → >4,5 sobre crema).
  - Objetivo táctil mínimo en las pestañas cortas del panel (`.panel-tabs button { min-width: 44px }`).
- Nota: medir el contraste justo después de cambiar de tema da falsos positivos por las transiciones de color; hay que auditar con las transiciones desactivadas.

## Responsive

Sin scroll horizontal en ninguna combinación: 7 rutas × 2 temas × 3 anchos (375, 768, 1440) = **42 / 42 OK**.

Capturas en [`docs/qa/`](qa/) con el formato `{ancho}-{tema}-{ruta}.png`. La «N» de la esquina es el indicador de desarrollo de Next y no aparece en producción.

## Pruebas manuales ya hechas (fases 2-5)

Onboarding, errores de login y recuperación de contraseña, borrador restaurado, toasts con acción, foco en el primer campo con error, filtros y acciones en bloque de la biblioteca, estados de la mascota (idle, thinking, success, error, empty, offline), entrenamiento de avatar, avatar por defecto y su aplicación automática en SOUL V2.

## Pendiente de probar con credenciales reales

- Generación real contra Higgsfield (Vercel todavía no tiene `HF_API_KEY_*`).
- Correos de recuperación: faltan las Redirect URLs del dominio en Supabase Auth.

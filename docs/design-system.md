# Design System — Iron Log

Fuente de verdad visual. Vista viva en `/dev/styleguide` (sólo en `NODE_ENV=development`).

## Dirección de arte

Oscuro por defecto, sin toggle de tema (`user_settings.tema` queda reservado a futuro, no implementado en v1). Alto contraste, "premium gym app".

## Paleta

Definida como custom properties en `src/app/globals.css`. `:root` ya es oscuro — no depende de `.dark` (esa clase queda como alias por si algún componente shadcn la referencia).

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#0A0A0B` | fondo base |
| `--card` / `--popover` | `#141416` / `#161618` | superficies elevadas |
| `--foreground` | `#F4F4F5` | texto principal |
| `--muted-foreground` | `#A1A1AA` | texto secundario |
| `--primary` / `--accent` | `#C6FF3D` (lima eléctrico) | **único acento saturado** — CTAs, progreso, PRs, focus ring |
| `--primary-foreground` | `#0A0A0B` | texto sobre el acento (AA garantizado: negro sobre lima) |
| `--destructive` | `#FF5449` | fallar serie, errores |
| `--success` | `#34D399` | confirmaciones secundarias (el acento ya cubre el caso principal) |
| `--border` / `--input` | blanco 10–14% opacidad | separadores sutiles |
| `--chart-1..5` | lima, cian, violeta, naranja, gris | series en Recharts — **no** es el "único acento", es paleta cualitativa de datos |

Regla: el lima se reserva para acciones primarias y momentos de logro. No pintar de lima elementos decorativos o texto largo — pierde jerarquía.

## Tipografía

- Familia: **Geist** (`next/font/google`, self-hosted en build, subset latino, `display: swap`, cero requests a Google en runtime).
- `font-variant-numeric: tabular-nums` en `body` por defecto — la UI está llena de cifras (peso, reps, timer) que no deben bailar de ancho.
- Radios: `--radius: 1.25rem` (20px), escalado vía `--radius-sm..4xl` en `@theme inline`.

## Movimiento

Un solo módulo, `src/lib/motion/springs.ts`, exporta tres springs con Motion:

| Spring | stiffness/damping | Uso |
|---|---|---|
| `snappy` | 500 / 30 | press states, check de serie, toggles |
| `smooth` | 300 / 32 | transiciones de layout, bottom sheets, shared elements |
| `bouncy` | 420 / 18 | PR toast, confetti, resumen final |

Reglas duras:
- Animar sólo `transform` y `opacity`. Nunca `width`/`height`/`top`.
- Stagger de listas (`listStagger` en el mismo módulo) sólo en el primer montaje.
- Respetar `prefers-reduced-motion`: sustituir por fade corto, nunca "sin nada".
- Presupuesto: 60 fps en gama media con throttling 4x en el profiler.

## Accesibilidad

- Targets táctiles ≥ 48px (clase utilitaria `min-h-12 min-w-12` como piso en componentes interactivos).
- Contraste AA mínimo — verificado en la tabla de paleta.
- Focus visible: `--ring` = lima, aplicado vía `outline-ring/50` en `@layer base`.
- `aria-live="polite"` obligatorio en el temporizador de descanso (Fase 4).

## Componentes

Base: **shadcn/ui** (Radix), estilo `base-nova`, `baseColor: neutral`. Se instalan bajo demanda (`pnpm dlx shadcn@latest add <componente>`) — no se pre-generan todos.

`/dev/styleguide` muestra: paleta con contraste, escala tipográfica, botones en sus estados (default/hover/press/disabled/focus), y los tres springs en vivo.

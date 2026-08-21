# Design System — Iron Log

Fuente de verdad visual. Vista viva en `/dev/styleguide` (sólo en `NODE_ENV=development`).

## Dirección de arte

**"Editorial silencioso"**: tema claro y oscuro con toggle real (Perfil → Apariencia,
persistido en `user_settings.theme`, aplicado server-side en `src/app/layout.tsx` para
evitar flash). Alto contraste, separadores de 1px en vez de tarjetas con borde+sombra —
la regla central del sistema es que casi nada lleva sombra.

## Paleta

Definida como custom properties en `src/app/globals.css`. `:root` es el tema **claro**,
`.dark` el **oscuro** — la clase se aplica en `<html>` según `user_settings.theme`, leído
en el layout raíz.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | `#FCFCFB` | `#0B0B0C` | fondo base |
| `--card` / `--popover` | `#FFFFFF` | `#141417` | superficies elevadas |
| `--foreground` | `#101013` | `#F6F6F4` | texto principal y números |
| `--ink2` | `#5C5C64` | `#A0A0A8` | texto secundario, labels de fila |
| `--muted-foreground` | `#9C9CA3` | `#6E6E76` | metadatos, hints, etiquetas en mayúscula |
| `--muted` / `--secondary` | `#F2F2EF` | `#1C1C20` | celdas de input, chips, barras vacías |
| `--primary` / `--accent` | `#2E6BFF` | `#4C82FF` | **único acento saturado** — CTAs, progreso, PRs, focus ring |
| `--primary-foreground` | `#FFFFFF` | `#06070A` | texto sobre el acento |
| `--accent-soft` | `rgba(46,107,255,.10)` | `rgba(76,130,255,.16)` | fondo de tab activa, bloque de PR, heatmap nivel 1 |
| `--success` | `#16A34A` | `#34D399` | check de serie completada |
| `--success-soft` | `rgba(22,163,74,.10)` | `rgba(52,211,153,.12)` | tinte de fila de serie completada |
| `--destructive` | `#DC2626` | `#FF5449` | fallar serie, errores |
| `--border` / `--input` | negro 9–14% opacidad | blanco 10–14% opacidad | separadores sutiles |
| `--chart-1..5` | azul (=acento), cian, violeta, naranja, gris | ídem, oscuro | series en Recharts — **no** es el "único acento", es paleta cualitativa de datos |

Regla: el acento se reserva para acciones primarias y momentos de logro. No pintarlo en
elementos decorativos o texto largo — pierde jerarquía. Regla del sistema: **no usar
tarjetas con borde + sombra** — separar con `border` de 1px o con aire; sólo dos sombras
existen en toda la app (CTA hero de Inicio, botón "Serie hecha" del Modo Enfoque).

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

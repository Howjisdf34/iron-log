# Architecture — Iron Log

ADRs cortos. Se añaden a medida que avanzan las fases, no se reescriben (si una
decisión se revierte, se agrega un ADR nuevo que la reemplaza).

## ADR-001: Next.js App Router + `output: standalone`

Server Components por defecto, Server Actions para mutaciones, imagen Docker mínima
(standalone traza sólo el `node_modules` que el server realmente usa). Justificado en
`CLAUDE.md` §2.

## ADR-002: Tema oscuro único, sin light mode

El brief pide "oscuro por defecto" y ningún criterio de éxito depende de un tema claro.
`:root` en `globals.css` ya es la paleta oscura (no depende de `.dark`), así que no hay
flash de tema incorrecto ni lógica de `next-themes` que mantener. Si en el futuro se
quiere modo claro, es un ADR nuevo, no una extensión silenciosa de este.

## ADR-003: Recharts sobre visx para gráficas

visx da control de bajo nivel tipo D3 pero exige más código para lo que necesitamos
(líneas/áreas/barras de 1RM, volumen semanal, streak). Recharts cubre eso de forma
declarativa con menos superficie de mantenimiento. Se revisará si Fase 6 necesita algo
que Recharts no pueda expresar razonablemente.

## ADR-004: `@node-rs/argon2` para hashing de contraseñas (Fase 1)

`node-argon2` requiere compilar bindings nativos con `node-gyp` en el momento de
`pnpm install`, lo que implica meter toolchain de compilación (`python3`, `make`,
`g++`) en la imagen Docker sólo para esa dependencia. `@node-rs/argon2` distribuye
binarios prebuilt para `linux-musl` (la libc de Alpine), evitando ese costo — imagen
final más chica y build más rápido, que es justo el presupuesto de la Fase 7.

## ADR-005: Media de ejercicios servida por un Route Handler propio, no `public/`

En `output: standalone`, el directorio `public/` se congela en el momento de
`next build` y se copia tal cual a la imagen. La media de ejercicios se descarga en
runtime (`pnpm seed:exercises`, Fase 2) hacia un volumen Docker montado en
`MEDIA_DIR` — un directorio que no existe todavía cuando se hace el build. Por eso
`/media/exercises/*` se sirve desde `src/app/media/exercises/[...path]/route.ts`
(Fase 2), que lee de `process.env.MEDIA_DIR` con `fs.createReadStream` y cache headers
fuertes (`Cache-Control: public, max-age=31536000, immutable` — los archivos son
inmutables una vez generados por el seed). Se descarta nginx como sidecar por
frugalidad de RAM en el VPS (§7 del brief).

## ADR-006: Fallback de ejercicios sin video → WebP animado de 2 frames

795 de 873 ejercicios de wger no tienen video (verificado con `curl` real, ver
`docs/DATA-SOURCES.md`). Para esos, `free-exercise-db` da 2 imágenes (inicio/fin).
En vez de alternar dos `<img>` con JS (estado, listeners, re-renders), el script de
seed genera un WebP animado de 2 frames con `ffmpeg` — un solo `<img>` sin JS en el
hot path del Workout Player, coherente con la regla de "animar sólo transform/opacity"
(esto ni siquiera es una animación de React, es un asset).

## ADR-006b: `outputFileTracingIncludes` explícito para `@swc/helpers`

Verificado en Fase 0 con `docker compose up --build`: el output tracing de Next 16 con
pnpm omite `node_modules/@swc/helpers/esm/*` del bundle standalone aunque el server lo
pide en runtime (`MODULE_NOT_FOUND` al arrancar). Es un issue conocido de Next.js con
pnpm. Se fuerza su inclusión en `next.config.ts` vía `outputFileTracingIncludes`. Si una
futura versión de Next lo arregla, este bloque se puede quitar sin romper nada — es
puramente aditivo.

**Pendiente Fase 7:** la imagen final del runner pesa ~296 MB, por encima del
presupuesto de <250 MB del brief (§8.1). El RAM en reposo sí cumple (~35 MB medidos,
muy por debajo de los <250 MB objetivo). Revisar en Fase 7 con el árbol de
dependencias completo (Drizzle, Auth.js, Serwist ya instalados) antes de optimizar —
recortar ahora sería prematuro.

## ADR-007: Husky + lint-staged (no lefthook)

El brief permite cualquiera de los dos. Husky es lo que ya conoce el ecosistema
Node/pnpm de este proyecto (no requiere instalar un binario adicional fuera de
`node_modules`), y `lint-staged` cubre exactamente lo que se necesita: ESLint +
Prettier sólo sobre los archivos en stage, más `tsc --noEmit` para el chequeo
completo de tipos antes de cada commit.

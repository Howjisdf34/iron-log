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

## ADR-008: Migraciones vía `instrumentation.ts`, no `drizzle-kit migrate` en entrypoint.sh

El brief (§8.3) pedía correr `drizzle-kit migrate` desde `entrypoint.sh` antes de
arrancar el server. En la práctica (ADR-006b) `drizzle-kit` es devDependency y no
sobrevive el output tracing de `next build --standalone` — el binario no existe en la
imagen final. La alternativa correcta con Next.js + Docker standalone es el migrator
programático de `drizzle-orm/node-postgres/migrator` (`src/db/migrate.ts`), que sí es
dependencia de producción, invocado desde el hook `register()` de
`src/instrumentation.ts` — corre una vez al iniciar el proceso, antes de que el server
acepte tráfico real.

**Trampa real encontrada al verificar con `docker compose up --build` (volumen limpio):**
Docker Compose lee `.env` del directorio del proyecto para resolver `${VAR}` dentro de
`docker-compose.yml` — esto es independiente de que la app también lea `.env` vía
`@next/env`. Como `.env` ahora tiene `DATABASE_URL=...@localhost:5433/...` (para que
`drizzle-kit`/`next dev`/`pnpm test:integration` corriendo en el HOST lleguen a la DB
por el overlay de `docker-compose.dev.yml`), pasar `DATABASE_URL: ${DATABASE_URL}` tal
cual en `docker-compose.yml` filtraba ese `localhost:5433` al contenedor — que
obviamente no puede resolverlo. Fix: `docker-compose.yml` arma la URL a partir de las
partes (`POSTGRES_USER`/`PASSWORD`/`DB`) con el host `db` (DNS interno) hardcodeado,
nunca toma `${DATABASE_URL}` completa. Sólo las credenciales vienen de `.env`/secrets
de Coolify — el host de conexión no es algo que deba variar por entorno.

Para la protección contra carreras, un advisory lock de Postgres
(`pg_advisory_lock`) es estrictamente más robusto que el lock de archivo en `/tmp` que
proponía el brief: funciona incluso si dos contenedores arrancan a la vez apuntando a
la misma DB, no sólo dentro de un mismo filesystem. `entrypoint.sh` queda reducido a
`exec node server.js`.

## ADR-009: `<Button>` (Base UI) necesita `type="submit"` explícito dentro de un `<form>`

**Footgun real, encontrado en producción por el usuario:** el botón de "Cerrar sesión"
no hacía nada al hacer click. Causa: `src/components/ui/button.tsx` envuelve
`Button` de `@base-ui/react/button`, y su hook interno (`useButton`) **hardcodea
`type: 'button'`** en cualquier botón nativo salvo que el consumidor pase `type`
explícitamente (`internals/use-button/useButton.js`, línea con
`isNativeButton ? { type: 'button' } : { role: 'button' }`). Sin `type="submit"`, un
click nunca dispara el `action` del `<form>` que lo envuelve — sin error en consola,
sin feedback visual, simplemente no pasa nada.

**Regla del proyecto:** todo `<Button>` que sea el submit de un `<form>` (Server
Action) DEBE llevar `type="submit"` explícito. El botón de login ya lo tenía por
casualidad; el de logout no, y fue el bug. Válido para todos los forms del Workout
Player en Fase 4 (completar serie, guardar nota, etc.) — revisar cada uno al
construirlo.

## ADR-010: `/media/[...path]/route.ts` necesita `turbopackIgnore` en cada llamada a fs

**Bug real encontrado en Fase 2, antes de commitear:** `pnpm build` compilaba bien y
sin errores, pero con 5 warnings de Turbopack sobre "dynamic filesystem access". Se
verificó el impacto real: `.next/standalone` pesaba **1.6 GB** (vs. ~28 MB normal).
Causa: `mediaRoot()` arma la ruta desde `process.env.MEDIA_DIR` (variable de entorno)
combinada con segmentos de la URL — el analizador estático de Turbopack no puede
probar que esa ruta está acotada a una subcarpeta fija, así que por seguridad traza
**todo el proyecto** (incluido `data/raw/`, que en esta máquina llegó a pesar 1.5 GB
de cache cruda) dentro del output standalone.

Fix: comentarios `/* turbopackIgnore: true */` en cada llamada a `resolve`/`join`/
`stat`/`createReadStream` que toca `filePath` — es exactamente lo que sugiere el
propio mensaje de warning de Next. La seguridad contra path traversal ya la garantiza
`resolveSafePath` a mano (chequea que el resultado siga empezando con `mediaRoot()`),
no depende del tracer de Turbopack.

**Regla del proyecto:** cualquier ruta de filesystem construida a partir de una env
var + input dinámico (no un literal estático) necesita este opt-out explícito. Correr
`pnpm build` y revisar la sección de warnings de Turbopack antes de cada commit que
toque acceso a filesystem — un build "exitoso" puede estar ocultando un output 50x
más pesado de lo debido.

## ADR-011: páginas que leen la DB necesitan `export const dynamic = "force-dynamic"`

**Bug real, encontrado con `docker compose build`** (no con `pnpm build` en el host,
donde sí había DB alcanzable en `localhost:5433` — por eso no se vio antes): el build
del `builder` stage de Docker no tiene red hacia Postgres, y `/creditos` tronaba con
`ECONNREFUSED` durante el build.

Causa: un Server Component async que hace `await db.select()...` sin usar ninguna API
de Next que dispare dynamic rendering (`cookies()`, `headers()`, `searchParams`, etc.)
es candidato a **Static Generation** — Next intenta ejecutar el componente UNA VEZ en
build time y hornear el HTML resultante. `/` no tuvo este problema porque `auth()` lee
`cookies()` internamente, lo que ya fuerza dynamic rendering; `/creditos` no tenía
ninguna señal así.

**Regla del proyecto:** toda page/route que le pegue a la DB directamente (sin pasar
por una API de Next que ya sea dynamic) lleva `export const dynamic = "force-dynamic";`
explícito. Aplica a todas las páginas de Fase 6 (historial, PRs, gráficas). Verificar
esto significa correr `docker compose build app` al menos una vez por fase que toque
páginas nuevas con acceso a DB — `pnpm build` solo, en el host, no lo detecta si tenés
una DB de desarrollo alcanzable.

## ADR-012: Timer de descanso — timestamp absoluto, no contador

**Requisito no negociable del brief (§5.3, criterio de éxito #4):** el timer tiene que
seguir siendo correcto aunque se bloquee la pantalla o se mate la pestaña. Un
`setInterval` que resta 1 segundo cada tick se desincroniza en cuanto el navegador
throttlea/pausa timers en background (todos lo hacen para ahorrar batería).

Solución: `restEndsAt` es un timestamp absoluto (`Date.now() + duracionMs`), guardado
en el store de Zustand (`src/lib/stores/workout-store.ts`, persistido a localStorage).
El componente (`rest-timer.tsx`) nunca cuenta — en cada render calcula
`restEndsAt - Date.now()`. `useTick` (`src/lib/hooks/use-tick.ts`) sólo fuerza
re-renders cada 250ms y en `visibilitychange`, para que la UI se actualice; el cálculo
en sí es sin estado. Volver de background con la pestaña bloqueada 3 minutos muestra el
tiempo correcto de inmediato, no seguido de un salto.

El anillo SVG anima `stroke-dashoffset` (no `transform`) — excepción deliberada a la
regla general de "sólo transform/opacity" del §6 del brief, que ahí mismo pide
explícitamente esta técnica para el anillo de descanso; es una propiedad de pintado,
no de layout, así que no hay layout thrashing real.

## ADR-013: Fase 4 no es offline — esa garantía llega completa en Fase 5

El Workout Player (Fase 4) registra series vía Server Actions (Postgres directo). El
criterio de éxito #2 del brief ("funciona al 100% sin internet") **no está cubierto
todavía**: sin la capa de Dexie/outbox + Service Worker de Fase 5, completar una serie
sin señal falla. Lo que sí se resolvió en Fase 4, como base para Fase 5:

- El estado persistido en localStorage (`iron-log-workout`) es sólo de navegación/UI
  (qué sesión, timer de descanso) — nunca datos de entrenamiento, para no tener dos
  fuentes de verdad compitiendo cuando llegue el outbox real.
- `startSessionForUser` reutiliza la sesión `in_progress` existente si ya hay una — así
  ni el banner de "reanudar" ni Fase 5 tienen que lidiar con sesiones huérfanas por
  dobles taps.
- `clientId` (uuid v7) ya se genera en cada `set_log`/`workout_session` insertado desde
  el servidor, dejando la columna lista para cuando el insert se mueva al cliente
  (Fase 5) sin migración de datos.

## ADR-014: 1RM estimado con fórmula de Epley; PRs de dos tipos en el Player

El brief pide documentar qué fórmula de 1RM se usa (§5.4). Epley
(`peso × (1 + reps/30)`) se eligió sobre Brzycki por ser más estable en rangos altos de
reps (Brzycki diverge cerca de 37 reps). Brzycki queda implementada en
`src/lib/one-rep-max.ts` para la comparativa de Fase 6, pero la detección de PR en vivo
del Player (`logSetForUser`) sólo compara dos tipos de `personal_records`:
`1rm_estimated` y `weight` (el peso máximo real levantado, sin importar reps) — un PR
de "más reps a este peso" o "más volumen" no dispara el toast en Fase 4, se deja para
las estadísticas de Fase 6, donde tiene más sentido como tabla que como interrupción en
medio de un set.

## ADR-015: Navegación entre ejercicios con Motion, sin View Transitions API

El brief sugiere View Transitions API con fallback a Motion para el swipe entre
ejercicios del Player. Motion (`AnimatePresence` + variants de slide) ya cubre la
transición animada por sí solo; superponer la View Transitions API al mismo cambio de
índice (no una navegación de página real) arriesga doble animación/parpadeo porque
ambos sistemas intentarían animar el mismo DOM a la vez. Se deja View Transitions API
para donde el brief la pide con más claridad — transiciones de página con shared
element (p. ej. card de rutina → detalle) — no para este caso.

## ADR-016: Outbox por `clientId` + evento `online`, sin Background Sync API

El brief (§5.5) pide "Background Sync (con fallback a sync al recuperar online)". En
la práctica, Background Sync API no existe en Safari/iOS ni en Firefox de escritorio
por defecto — es soporte parcial, sólo Chromium. El fallback a `online` es, en los
hechos, el único mecanismo que funciona en **todos** los navegadores, así que Fase 5 lo
implementa como el camino principal (`src/lib/offline/use-outbox-sync.ts`), no como
fallback de un Background Sync real. Se evalúa agregar `registration.sync.register(...)`
como mejora incremental sólo si en el futuro hace falta cubrir el caso "la pestaña se
cerró del todo y la app no volvió a abrirse antes de recuperar señal" — hoy, con la app
abierta (aunque sea en background) en el celular del gym, el evento `online` alcanza.

La idempotencia real la da `clientId` (uuid v7, generado siempre en el cliente —
también para el path online normal, no sólo el offline): `setLogs.clientId` tiene
`UNIQUE`, y `logSetForUser` inserta con `onConflictDoNothing` + fallback a `SELECT` si
ya existía. Reenviar el mismo batch de `/api/sync` 3 veces dejaría el mismo resultado
— verificado con test de integración (`mutations.integration.test.ts`, caso
"idempotente por clientId") y con el E2E real de corte de red.

## ADR-017: Service worker bundleado con esbuild, no con el plugin de `@serwist/next`

**Bug real encontrado al correr `pnpm build`:** `withSerwistInit` (el wrapper estándar
de `@serwist/next` para `next.config.ts`) inyecta un plugin de **webpack** que compila
`src/app/sw.ts` e inyecta el manifest de precache. Turbopack —el bundler de este
proyecto desde la Fase 0— no soporta ese plugin: el build falla con *"This build is
using Turbopack, with a webpack config and no turbopack config"*. El propio warning de
Serwist lo advierte y sugiere 3 salidas: usar webpack (retroceder toda la app),
`@serwist/turbopack` (experimental) o "modo configurador" (una API separada,
pensada para invocarse como paso de build aparte, no como plugin de `next.config.ts`).

Se optó por una cuarta vía, más simple que las tres: `src/app/sw.ts` se bundlea con
**esbuild** directo (`scripts/build-sw.ts`, corrido después de `next build` vía
`pnpm build`), sin pasar por ningún plugin de Next. Esto significa que el service
worker **no precachea el app shell entero** en el evento `install` (perdemos el
manifest de precache automático de Serwist) — pero el caso real que importa ya queda
cubierto sin eso: no se puede empezar una sesión de entrenamiento sin red (el primer
`/entrenar/[id]` siempre se visita online), así que para cuando el usuario corta la
red a mitad de una sesión, esa página y sus JS chunks ya están en el cache del
navegador vía el runtime caching normal (`defaultCache` de `@serwist/next/worker`,
que sí se puede importar como librería plana sin el plugin de webpack). El fallback
`/offline` se cachea a mano en `install` (`caches.open(...).then(c => c.add(...))`) y
se sirve vía `serwist.setCatchHandler(...)`, sin depender del sistema de precache de
Serwist tampoco.

**Regla del proyecto:** cualquier librería que ofrezca "integración con Next.js" debe
verificarse contra Turbopack, no sólo contra la doc genérica — varias todavía asumen
webpack por defecto. `serwist`/`@serwist/next` siguen siendo dependencias reales (se
usan como librería, `import { Serwist, CacheFirst, ... } from "serwist"` y
`import { defaultCache } from "@serwist/next/worker"`), sólo se descartó su plugin de
build.

## ADR-018: E2E de Fase 5 corre contra Docker, no contra `next start`

`output: "standalone"` (ADR-001) no funciona con `next start` — hay que copiar
`public/` y `.next/static/` junto al `server.js` generado (exactamente lo que hace el
Dockerfile a mano). Se probó replicar eso en un script local
(`node .next/standalone/server.js`), pero en esta máquina Windows falla con
`EPERM: operation not permitted, stat ...node_modules\react` — `realpathSync` sobre
los symlinks que arma pnpm dentro de `node_modules/.pnpm` no siempre tiene permisos
sin modo desarrollador/admin habilitado.

En vez de perseguir ese problema específico de Windows, `playwright.config.ts` levanta
el stack real con `docker compose -f docker-compose.yml -f docker-compose.dev.yml up
--build` como `webServer` — corre Linux dentro del contenedor (sin el problema de
symlinks), y de paso prueba el artefacto real que se despliega en Coolify, no una
aproximación local. El test importa `src/db` directo para sembrar usuario/rutina/sesión
(mismo patrón que los tests de integración de Vitest) contra la DB expuesta en
`localhost:5433` por el overlay de dev — que es la misma DB a la que se conecta el
contenedor de la app vía `db:5432` (DNS interno de compose).

**Regla del proyecto:** antes de `pnpm test:e2e` hace falta la DB de dev levantada
(`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db`) y Docker
en el PATH de la sesión (mismo caveat de siempre en Windows tras instalar Docker
Desktop — abrir una terminal nueva).

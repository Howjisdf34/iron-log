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

## ADR-019: `startOfIsoWeek` usa getters UTC, no locales

**Bug real, encontrado por un test unitario de Fase 6** (`muscle-volume.test.ts`):
`new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))` mezclaba un
constructor UTC con getters **locales** (`getFullYear`/`getMonth`/`getDate`). Con
`TZ=America/Mexico_City` (docker-compose.yml), una fecha-string como `"2026-01-12"`
—que `new Date(...)` parsea como medianoche UTC— cae en "11 de enero" en hora local, así
que los getters locales devolvían el día equivocado y la semana calculada quedaba
corrida. El test lo agarró porque comparaba una fecha-string simple contra el resultado
esperado; con los timestamps completos (`T15:00:00Z`) que se usaron en los primeros
tests no se notaba, porque restar 6 horas no cruzaba medianoche para esas horas
puntuales — **una lección aparte: probar con fechas-string simples, no sólo
timestamps con hora explícita, para lo que dependa de "qué día calendario es".**

**Regla del proyecto:** cualquier función de fecha que combine `Date.UTC()` con
getters usa `getUTC*()` en los dos lados, nunca mezcla local con UTC. Ver
`src/lib/date-buckets.ts`.

## ADR-020: El lint de pureza de React también corre en Server Components

Se asumía que `react-hooks/purity` (ver ADR-012) sólo aplicaba a componentes cliente
con re-renders reales. Al escribir `/historial` (Server Component, `async function`)
con `new Date(Date.now() - ...)` para acotar una query, el linter lo marcó igual que
hubiera marcado un `"use client"`. **Regla del proyecto:** ningún componente —
servidor o cliente— llama `Date.now()`/`Math.random()` directo en el cuerpo de la
función; se arma el valor con `new Date()` (sin argumentos) y métodos de instancia
(`setUTCDate`, etc.), o se recibe como prop/parámetro ya calculado.

## ADR-021: Export/import — revivir fechas genérico, no enumerado a mano

**Bug real, encontrado por el test de integración del round-trip de export/import**
(`history.integration.test.ts`): el primer intento de `src/lib/validation/export-dump.ts`
enumeraba a mano qué campos de cada tabla anidada (rutinas→días→ejercicios→series,
sesiones→series) eran `timestamp` para coercionarlos con `z.coerce.date()`. Se
olvidaron `createdAt`/`updatedAt` de `routine_days`, `routine_exercises` y
`routine_sets` — al restaurar, Drizzle explotó con `value.toISOString is not a
function` (su `PgTimestamp.mapToDriverValue` exige un `Date` real, node-postgres NO
acepta un string ISO ahí pese a que sí lo hace en otros paths — no asumir que sí sin
probarlo).

En vez de perseguir el enumerado field por field (fràgil: cualquier columna
`timestamp` nueva que se agregue después vuelve a romper esto en silencio), se
reemplazó por `src/lib/json-date-reviver.ts`: recorre el JSON entero y convierte
cualquier string con forma de timestamp ISO completo (`.../\d{4}-\d{2}-\d{2}T...Z/`)
a `Date`, sin importar en qué campo esté. Las fechas simples (`body_metrics.date`,
tipo `date` de Postgres, que Drizzle sí espera como string) no matchean el regex
porque no tienen componente de hora, así que se dejan intactas. El schema de Zod
(`userDataDumpSchema`) quedó más simple: sólo valida forma/ids, ya no coerciona
fecha por fecha — esa responsabilidad es del reviver, aplicado ANTES de Zod.

**Regla del proyecto:** para revivir `Date` desde JSON en una estructura anidada,
usar un reviver genérico basado en el shape del valor (regex de timestamp ISO), no
una lista de campos mantenida a mano — y cubrirlo con un test de integración que haga
el round-trip completo (`JSON.stringify` → `JSON.parse` → revive → insert real en
Postgres), no sólo una prueba con el objeto en memoria sin serializar.

## ADR-022: Presupuesto de bundle — Turbopack no da un desglose por ruta

El brief (§7) pide <150KB gzip de First Load JS en el Workout Player, medido con
`@next/bundle-analyzer`, fallando el build si se pasa. En la práctica, ninguna de las
dos partes es directa con Turbopack (el bundler del proyecto desde la Fase 0):

- `@next/bundle-analyzer` se apaga solo bajo Turbopack (`process.env.TURBOPACK` →
  imprime un warning y no genera nada). La alternativa oficial,
  `next experimental-analyze`, sí funciona, pero produce un explorador **interactivo**
  pensado para un humano, no un JSON fácil de scriptear en CI.
- Next 16 + App Router ya no imprime la tabla clásica de "First Load JS" por ruta de
  Next 12-14: el código se resuelve como referencias RSC, no como un bundle único
  identificable de antemano. Lo único estable y scripteable es `rootMainFiles` +
  `polyfillFiles` del `build-manifest.json` de una ruta — que resultó ser **el mismo
  para todas las rutas** (se comparó `/login` contra `/entrenar/[sessionId]` con
  `diff`: son idénticos). Es el runtime compartido de React 19 + Next 16, no el peso
  específico del Workout Player.

Ese runtime compartido mide ~166KB gzip por sí solo — ya arriba del objetivo de
150KB, y no es algo que el código de la app pueda reducir (es el piso del framework).
Confirmar que Motion/Dexie/dnd-kit/Recharts SÍ quedan fuera de ese número (code
splitting real) se hizo a mano con `next experimental-analyze -o`, inspeccionando
`analyze.data` de `/entrenar/[sessionId]` — encontró `dexie.min.js` ahí, no en el
runtime compartido, confirmando que sólo se carga en las rutas que de verdad lo usan.

`scripts/check-bundle-budget.ts` quedó como lo que se puede sostener con honestidad:
un detector de **regresiones** sobre el runtime compartido (techo generoso de 200KB,
bien por encima del piso actual de ~167KB), no una verificación literal del target de
150KB — que se documenta como no alcanzado y no accionable con las herramientas
actuales de Turbopack, en vez de simular que sí se cumple.

De paso, se aprovechó para sacar Dexie del bundle compartido de `providers.tsx`
(`SyncStatusBadge` vía `next/dynamic({ ssr: false })`, `useOutboxSync` vía
`import()` dinámico dentro del `useEffect`) — no cambió el número de
`rootMainFiles` (confirma que ese manifest no lo contaba de entrada), pero evita que
páginas como `/login`, que nunca tocan el outbox offline, paguen el costo de
inicializar IndexedDB antes de tiempo.

**Regla del proyecto:** para medir bundles reales por ruta bajo Turbopack, usar
`next experimental-analyze` a mano (explorador interactivo) — no existe hoy un
equivalente scripteable confiable para CI. Revisar si versiones futuras de Next
agregan una salida JSON estable a `experimental-analyze` antes de reintentar
automatizarlo.

## ADR-023: `restore.sh` borra la media como root, no como `nextjs`

**Bug real, encontrado probando `scripts/restore.sh` de punta a punta** (no sólo
escribiéndolo — CLAUDE.md §8.5 lo pide explícitamente). El primer intento hacía
`docker compose exec app sh -c "rm -rf /app/media/* && tar xzf ..."`, corriendo como
el usuario por defecto del contenedor (`nextjs`, no-root, ver Dockerfile). Falló con
`Permission denied` sobre archivos de `media/exercises/facepull/*`: el volumen
`media` venía de una versión más vieja de la imagen/sesión de desarrollo donde esos
archivos se crearon con otro dueño, y `nextjs` no tiene permiso para borrarlos.

Fix: `docker compose exec -u root app sh -c "rm -rf ... && tar xzf ... && chown -R
nextjs:nodejs /app/media"` — `-u root` pisa el `USER nextjs` del Dockerfile sólo
para este exec puntual (el proceso principal del contenedor sigue corriendo como
`nextjs` todo el tiempo, esto no lo cambia), y el `chown` final deja todo de vuelta
con el dueño correcto para cuando la app vuelva a leer/escribir esos archivos.

**Regla del proyecto:** cualquier operación de mantenimiento que necesite borrar o
reescribir archivos en un volumen persistente (no sólo media — pensar lo mismo para
futuros volúmenes) debe asumir que el volumen puede tener contenido de un dueño
distinto al usuario actual de la imagen, y correr esa operación puntual como root
vía `docker compose exec -u root`, nunca cambiando el `USER` del Dockerfile en sí.

## ADR-024: Imagen de ~310MB — por encima del presupuesto de 250MB del brief, aceptado

Pendiente desde ADR-006b (Fase 0, ~296MB) y crecido a ~310MB. Investigado a fondo en
Fase 7 con `docker history` capa por capa:

- La capa del propio `node:22-alpine` que instala Node.js (`RUN addgroup -g 1000
  node && ...`) pesa **160MB** ella sola — de eso, el binario `node` son 123MB. Más
  9MB del rootfs de Alpine y ~5MB de paquetes apk del entrypoint oficial: la imagen
  base sin agregar nada propio ya son ~180MB, el 72% del presupuesto de 250MB.
- Lo que agrega este proyecto encima (`COPY .next/standalone`, `.next/static`,
  `drizzle`, `node_modules` podado por el output tracing de Next) es sólo **~60MB**
  — verificado con `docker run --rm trackinglife-app du -sh /app/*`.
- Se intentó borrar `npm`/`corepack`/headers de compilación (no se usan en runtime,
  sólo se corre `node server.js`) con un `RUN rm -rf ...` en el stage `runner`.
  **No cambió el tamaño reportado por `docker images` en absoluto** — el `rm -rf`
  crea una nueva capa con "whiteouts" que oculta los archivos en el filesystem
  fusionado de un contenedor corriendo, pero la capa base de `node:22-alpine` que
  los agregó originalmente sigue siendo parte de la imagen igual, con su tamaño
  completo. Confirmado con `docker history`: la capa del `rm -rf` pesa 24.6kB, no
  -25MB. Borrar archivos en una capa posterior nunca reduce el tamaño final de una
  imagen por capas — hace falta que no se agreguen en primer lugar (multi-stage,
  que es justo lo que este Dockerfile ya hace para el resto) o `--squash`
  (experimental, no garantizado en el Docker de Coolify).

**Conclusión:** para bajar de 250MB de verdad haría falta una imagen base sin
Node.js preinstalado (armar el runtime a mano sobre `alpine:3.20` puro, copiando el
binario de `node` y sus libs compartidas) — invasivo, fragil entre versiones de
Node, y el ahorro real seguiría siendo acotado porque el binario de `node` en sí
(123MB) es el grueso del problema, no algo removible. Dado que el otro presupuesto
del brief —RAM en reposo— **sí se cumple con margen** (58MB medidos con `docker
stats` contra un límite de 512MB en `docker-compose.yml` y un objetivo de <250MB en
el brief), se acepta el tamaño de imagen como está. Es un costo de transferencia al
hacer `pull` (una vez por deploy), no un costo de RAM ni de CPU en el VPS corriendo.

## ADR-025: manifest/sw.js/iconos tienen que ser públicos en el proxy

**Bug real, encontrado corriendo Lighthouse en Fase 7** contra la app dockerizada:
`/manifest.webmanifest` y `/sw.js` devolvían **302 a `/login`** en vez del archivo.
`src/proxy.ts` (el middleware de auth, ver `PUBLIC_PATHS`/`PUBLIC_PREFIXES`) sólo
dejaba pasar `/login`, `/api/auth`, `/api/health`, `/dev`, `/_next` y `/favicon.ico`
sin sesión — todo lo demás, incluidos el manifest y el service worker, quedaba
detrás del login. El navegador pide esos dos archivos para evaluar si la PWA es
instalable **antes** de que exista ninguna sesión (por ejemplo, la primera vez que
alguien visita `/login`) — con esto roto, la app nunca era instalable de verdad,
aunque todo el código de Fase 5 estuviera bien.

Fix: agregar `/offline`, `/manifest.webmanifest`, `/sw.js`, `/favicon.png`,
`/apple-touch-icon.png` a `PUBLIC_PATHS` y `/icons` a `PUBLIC_PREFIXES`. Ninguno de
estos expone datos de usuario — son exactamente los assets que un navegador anónimo
necesita para poder ofrecer "instalar app".

**Regla del proyecto:** todo asset nuevo que la Fase 5/PWA agregue (iconos,
manifest, service worker, páginas de fallback offline) tiene que revisarse contra
`src/proxy.ts` explícitamente — no asumir que "es una ruta nueva, ya va a heredar
las reglas correctas". El middleware es allowlist, no blocklist: por defecto todo
requiere sesión.

**Resultado final, medido con Lighthouse real (`pnpm dlx lighthouse`, mobile,
throttling simulado) contra la app dockerizada, autenticado, después de este fix:**

| Página | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 100 |
| `/rutinas` (con datos reales) | 92 | 100 | 100 | 100 |

Todos por encima de los objetivos del brief (§7: Performance ≥90, Accessibility
≥95, Best Practices ≥95). La categoría "PWA" de Lighthouse ya no existe en
versiones recientes (Google la sacó del core de Lighthouse) — la instalabilidad se
verificó a mano: manifest válido y público, iconos maskable 192/512 accesibles,
service worker registrado con `Content-Type: application/javascript` correcto, y
`/offline` como fallback — ver esta misma sección para el bug que había roto todo
esto.

## ADR-026: `pnpm/action-setup` no admite dos versiones de pnpm a la vez

**Bug real, encontrado en el primer run de CI contra GitHub real** (el repo recién
se creó y pusheó en Fase 7 — el workflow de `.github/workflows/ci.yml`, escrito en
la Fase 0, nunca había corrido de verdad hasta entonces). Falló con
`ERR_PNPM_BAD_PM_VERSION`: el step `pnpm/action-setup@v4` tenía `version: 11`
explícito, y `package.json` ya trae `"packageManager": "pnpm@11.22.0"` — la action
detecta las dos fuentes en conflicto y corta en vez de adivinar cuál priorizar.

Fix: sacar el `version:` del step. `pnpm/action-setup@v4` lee `packageManager` de
`package.json` solo cuando no se le pasa una versión explícita — que es justo la
única fuente de verdad que hace falta (ya la usa Corepack en Docker/local también).

**Regla del proyecto:** un workflow de CI escrito antes de que el repo exista en
GitHub no está verificado — sólo *parece* correcto por revisión visual. La primera
vez que un push real lo dispara es, en los hechos, su primer test end-to-end.
Tratar "el workflow nunca corrió" como una señal explícita de riesgo, igual que
cualquier código sin cobertura.

## ADR-027: `pnpm typecheck` en CI necesita `next typegen` primero

**Segundo bug real del primer run de CI** (mismo push que ADR-026, después de
arreglar el de pnpm): `tsc --noEmit` falló con `Cannot find name 'LayoutProps'` en
`src/app/layout.tsx`. `LayoutProps`/`PageProps` son tipos ambiente que Next genera
en `.next/types/*.d.ts` (declarados en `tsconfig.json` → `include`) — sólo existen
después de correr un build o un typegen. En esta máquina de desarrollo siempre hubo
un `.next/` de sobra de builds anteriores, así que `pnpm typecheck` nunca se corrió
de verdad contra un checkout limpio hasta CI.

Fix: agregar `pnpm exec next typegen` (comando dedicado, no hace falta un build
completo) como paso de CI justo antes de `pnpm typecheck`.

**Regla del proyecto:** cualquier chequeo que dependa de artefactos generados
(`.next/types`, migraciones aplicadas, etc.) hay que probarlo alguna vez contra un
checkout realmente limpio — `git clean -xdf` local antes de confiar en que un
comando "siempre funcionó" es más barato que descubrirlo en el primer CI real.

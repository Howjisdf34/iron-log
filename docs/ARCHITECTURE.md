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

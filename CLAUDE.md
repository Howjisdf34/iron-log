# PROMPT PARA CLAUDE CODE — "Iron Log" (PWA de rutinas de gimnasio, self-hosted en Coolify)

> Copia todo lo que sigue y pégalo como primer mensaje en Claude Code, dentro de una carpeta vacía.
> Sugerencia: arranca en **plan mode** (`shift+tab` dos veces) para que primero te devuelva el plan y lo apruebes.

---

## 0. ROL Y CONTEXTO

Actúa como **Senior Full-Stack Engineer + Product Designer** especializado en PWAs offline-first, animación de interfaces y despliegue self-hosted con Docker/Coolify.

Voy a construir contigo una aplicación web llamada **Iron Log**: un gestor de rutinas de gimnasio con seguimiento granular de cada serie, pensado para usarse **con el celular en la mano, dentro del gimnasio, muchas veces sin señal**.

**Contexto de infraestructura (no negociable):**

- Se despliega en un **VPS casero con Ubuntu Server + Coolify**, hardware limitado (asume peor caso: **2 vCPU / 4 GB RAM / disco SSD modesto**).
- Sólo la usaremos **2 personas** (yo y mi pareja), con **cuentas y rutinas totalmente separadas**. No es un SaaS público: no necesita registro abierto, onboarding de marketing, multi-tenant complejo, ni escalabilidad horizontal.
- El servidor también corre otros servicios, así que la app debe ser **frugal en RAM y CPU en reposo**.

**Reglas de trabajo conmigo:**

- Explicaciones en **español**, terminología técnica en **inglés**.
- Sé directo y estructurado. Nada de introducciones largas.
- Antes de escribir código, entrégame un **plan por fases** y espera mi OK.
- Trabaja **fase por fase**. Al terminar cada fase: corre lint + typecheck + tests, haz un commit atómico con mensaje convencional, y dame un resumen corto de qué cambió y qué sigue.
- Si una decisión técnica tiene trade-offs reales (rendimiento vs. complejidad), plantéame las opciones en 3 líneas y una recomendación, no te quedes bloqueado.
- **No inventes APIs ni campos de datos**: si dependes de un endpoint externo, primero haz un `curl` real y verifica el shape de la respuesta antes de tipar nada.

---

## 1. OBJETIVO DEL PRODUCTO

Una PWA instalable, mobile-first, que haga que **entrenar se sienta como un videojuego bien hecho**: fluida, satisfactoria, sin fricción, y que registre todo lo que importa para progresar de verdad.

El corazón del producto es el **Workout Player**: la pantalla que uso mientras entreno. Todo lo demás (crear rutinas, ver historial, estadísticas) existe para alimentarla.

### Criterios de éxito (así se evalúa si lo hiciste bien)

1. Puedo registrar una serie completa (peso + reps + RPE) en **≤ 2 taps** sin teclado, desde la pantalla bloqueada del gym.
2. La app **funciona al 100% sin internet** durante una sesión completa y sincroniza sola al recuperar señal, sin duplicar datos.
3. Terminar una serie y terminar un entrenamiento se sienten **físicamente satisfactorios** (animación + haptics + sonido opcional).
4. El temporizador de descanso es **correcto aunque cierre la app o bloquee la pantalla**.
5. Antes de cada ejercicio veo **cómo se hace**, en menos de 5 segundos y sin salir del flujo.
6. En el VPS, el contenedor en reposo consume **< 250 MB RAM**, y el TTI en 4G lenta es **< 3 s**.

---

## 2. STACK TÉCNICO (usa exactamente esto salvo que justifiques lo contrario)

| Capa            | Tecnología                                                                                  | Por qué                                                 |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Framework       | **Next.js (App Router, versión estable actual)** con `output: "standalone"`                 | SSR + RSC, imagen Docker mínima                         |
| Lenguaje        | **TypeScript en modo `strict`**                                                             | cero `any` implícitos                                   |
| Estilos         | **Tailwind CSS** + **shadcn/ui** (Radix)                                                    | accesible, tree-shakeable, sin runtime CSS-in-JS        |
| Animación       | **Motion** (antes Framer Motion) + CSS transforms + **View Transitions API** con fallback   | 60 fps en gama media                                    |
| Estado servidor | **TanStack Query** con persister a IndexedDB                                                | cache + offline + optimistic updates                    |
| Estado local UI | **Zustand** (store del workout activo)                                                      | mínimo boilerplate                                      |
| DB              | **PostgreSQL 17-alpine**                                                                    | fiable, ya lo maneja Coolify                            |
| ORM             | **Drizzle ORM** + `drizzle-kit` migrations                                                  | SQL-first, bundle chico, migraciones versionadas en git |
| DB offline      | **Dexie.js** (IndexedDB)                                                                    | outbox + cache de ejercicios/media                      |
| Auth            | **Auth.js v5 (NextAuth)**, provider **Credentials** + Argon2id, sesión JWT httpOnly 90 días | 2 usuarios, sin OAuth externo                           |
| PWA / SW        | **Serwist** (`@serwist/next`)                                                               | service worker moderno, precache + runtime caching      |
| Validación      | **Zod** compartido entre client, server actions y seed                                      | una sola fuente de verdad                               |
| Gráficas        | **Recharts** o **visx** (elige y justifica)                                                 | historial de volumen/1RM                                |
| Tests           | **Vitest** (unit) + **Playwright** (E2E crítico)                                            |                                                         |
| Calidad         | ESLint (flat config) + Prettier + `tsc --noEmit` + Husky/lefthook pre-commit                |                                                         |

**Prohibido sin pedirme permiso:** Redis, Elasticsearch, Kafka, microservicios, Kubernetes, tRPC, GraphQL, Sentry SaaS, Vercel Analytics, cualquier SDK que llame a terceros en runtime, y cualquier dependencia de pago.

**Reglas de arquitectura:**

- **Server Components por defecto**; `"use client"` sólo donde hay interacción real (Workout Player, formularios, gráficas).
- Mutaciones vía **Server Actions** tipadas con Zod, más un **API Route `/api/sync`** para el batch offline.
- Sin `useEffect` para fetching. Sin estado duplicado entre servidor y cliente.
- Cero variables de entorno con secretos en el bundle cliente (`NEXT_PUBLIC_*` sólo para cosas públicas).

---

## 3. MODELO DE DATOS (Drizzle + Postgres)

Diseña el schema con estas entidades. Usa `uuid v7` como PK (ordenables por tiempo, generables en el cliente → clave para offline). Todas las tablas con `createdAt`, `updatedAt`, y las que sincronizan con `syncedAt` + `clientId`.

### Catálogo (compartido, read-only para el usuario)

- **`exercises`** — `id`, `slug`, `nameEs`, `nameEn`, `category` (compound/isolation/cardio/mobility), `force` (push/pull/static), `mechanic`, `level`, `equipmentId`, `primaryMuscles[]`, `secondaryMuscles[]`, `instructionsEs[]`, `defaultRestSeconds`, `isUnilateral`, `tracksWeight`, `tracksReps`, `tracksTime`, `tracksDistance`, `source`, `sourceId`, `licenseNote`.
- **`equipment`**, **`muscles`** (con `nameEs` y coordenadas para el mapa muscular SVG).
- **`exercise_media`** — `exerciseId`, `type` (`video` | `image_sequence` | `gif`), `localPath`, `originalUrl`, `posterPath`, `durationMs`, `attribution`, `license`, `isPrimary`.
- **`exercise_aliases`** — para búsqueda ("press banca", "bench press", "pecho plano").

### Planificación

- **`routines`** (= plan/mesociclo) — `id`, `userId`, `name`, `description`, `goal` (strength/hypertrophy/endurance/recomp), `splitType` (`ppl` | `upper_lower` | `full_body` | `arnold` | `bro_split` | `custom`), `daysPerWeek`, `weeksTotal`, `deloadEveryNWeeks`, `isActive`, `archivedAt`.
- **`routine_days`** — `routineId`, `order`, `name` ("Push A"), `weekdayHint` (nullable, la rutina puede ser cíclica y no atada a días fijos), `estimatedMinutes`, `notes`.
- **`routine_exercises`** (slots) — `dayId`, `order`, `exerciseId`, `supersetGroup` (nullable: mismo valor = superserie), `restSeconds`, `tempo` (ej. `3-1-1-0`), `notes`, `progressionRuleId`.
- **`routine_sets`** (prescripción por serie, no sólo "4x8") — `routineExerciseId`, `setNumber`, `setType` (`warmup` | `working` | `drop` | `failure` | `amrap` | `backoff`), `targetReps` o `targetRepsMin`/`targetRepsMax`, `targetWeightKg` (nullable), `targetRpe`, `targetPercent1rm`, `restSecondsOverride`.
- **`progression_rules`** — `type` (`double_progression` | `linear` | `rpe_autoregulated` | `percentage_1rm` | `manual`), `params` (jsonb). Ej. double progression: "si completas el tope del rango en todas las series, +2.5 kg la próxima".

### Ejecución (lo que realmente pasa en el gym)

- **`workout_sessions`** — `id`, `userId`, `routineDayId` (nullable → permite entrenamiento libre), `startedAt`, `finishedAt`, `durationSeconds`, `bodyweightKg`, `mood` (1-5), `energy` (1-5), `notes`, `totalVolumeKg`, `totalSets`, `status` (`in_progress` | `completed` | `abandoned`), `clientId` (idempotencia).
- **`set_logs`** — `sessionId`, `exerciseId`, `routineSetId` (nullable), `order`, `setType`, `weightKg`, `reps`, `rpe`, `rir`, `timeSeconds`, `distanceM`, `restTakenSeconds` (medido real, no el prescrito), `isPr`, `failed`, `notes`, `completedAt`, `clientId`.
- **`personal_records`** — `userId`, `exerciseId`, `type` (`1rm_estimated` | `weight` | `reps_at_weight` | `volume` | `time`), `value`, `setLogId`, `achievedAt`.
- **`body_metrics`** — `userId`, `date`, `weightKg`, `bodyFatPct`, medidas opcionales (`chest`, `waist`, `arm`, `thigh`), `photoPath`.
- **`plate_inventory`** — `userId`, `barWeightKg`, `platesAvailable` (jsonb: `{"20":4,"10":2,"5":2,"2.5":2,"1.25":2}`), `unit` (`kg` | `lb`), `hasMicroplates`. **Sirve para la calculadora de discos.**
- **`user_settings`** — unidad de peso, incremento por defecto, sonidos on/off, haptics on/off, tema, idioma, `restAutoStart`, `keepScreenAwake`.

### Reglas de integridad

- `ON DELETE CASCADE` donde tenga sentido; **nunca borres `set_logs` en cascada por editar una rutina** (el historial es sagrado → los slots se versionan o se marcan `archivedAt`).
- Índices en `(userId, startedAt DESC)`, `(sessionId, order)`, `(userId, exerciseId, achievedAt DESC)`.
- `clientId` con **UNIQUE constraint** → la sincronización es idempotente por construcción.

Entrégame un **diagrama ER en Mermaid** en `docs/schema.md` antes de escribir las migraciones.

---

## 4. DATOS DE EJERCICIOS Y VIDEOS (paso crítico — hazlo primero)

No quiero escribir 800 ejercicios a mano. Construye un **script de seed idempotente** (`pnpm seed:exercises`) que:

### Fuentes (verifica cada una con `curl` antes de codear)

1. **wger** — `https://wger.de/api/v2/` (API pública, lectura sin auth, `?format=json&language=4&limit=...`).
   - `exerciseinfo/` → ejercicio + traducciones (**incluye español**) + músculos + equipo + **videos** + imágenes.
   - `video/`, `exerciseimage/`, `muscle/`, `equipment/`, `exercisecategory/`.
   - Los videos de wger son mp4 cortos y sin audio: **exactamente lo que quiero** (demostración limpia, no un tutorial de 10 min de YouTube).
2. **free-exercise-db** (`yuhonas/free-exercise-db`, dominio público / Unlicense) — 800+ ejercicios con `instructions[]` en inglés y **2 imágenes por ejercicio (posición inicial y final)**. Sirve de fallback: con esas 2 frames armas un **loop animado** que comunica el movimiento sin pesar nada.
3. Fallback final: placeholder con el mapa muscular resaltado + instrucciones en texto.

### Requisitos del pipeline

- **Descarga los media a disco del VPS** (`/app/media/exercises/...`, volumen persistente) y sírvelos desde nuestro dominio. **No hotlinkees** a wger ni a raw.githubusercontent en runtime: rompe el offline, añade latencia y depende de terceros.
- Transcodifica con `ffmpeg` en el **build/seed, nunca en runtime**: video → `.webm` (VP9) + `.mp4` (H.264 fallback), **≤ 720p, ≤ 8 s, sin audio, ≤ 500 KB**, más un `poster.webp`. Imágenes → `.webp` ≤ 60 KB.
- **Traduce y normaliza al español**: nombres e instrucciones. Donde wger ya tenga traducción, úsala; donde no, deja el inglés y marca `needsTranslation: true` para que yo lo corrija después desde un panel simple.
- Guarda `attribution` y `license` por cada media y muéstralos en `/creditos`. (wger es CC-BY-SA: **respeta la atribución**.)
- El seed debe ser **reanudable y cacheado**: si ya descargaste un archivo, no lo vuelvas a bajar. Guarda el JSON crudo en `data/raw/` versionado o en `.gitignore` según tamaño, y documenta la decisión.
- Deja un **fixture pequeño** (`data/exercises.sample.json`, ~30 ejercicios) para tests y desarrollo sin red.

---

## 5. FUNCIONALIDAD (por módulo)

### 5.1 Auth y usuarios

- Login con email + contraseña. **Sin registro público**: los 2 usuarios se crean con `pnpm user:create` (CLI) o con un `SEED_USERS` en el primer arranque.
- Rate limiting básico en el login (in-memory, no Redis).
- Aislamiento estricto: **toda query filtra por `userId` de la sesión**. Escribe un test que lo verifique.
- Opcional: un modo "compartir rutina" que genera un link de sólo lectura con token, para que ella pueda copiarse una de mis rutinas.

### 5.2 Constructor de rutinas

- Wizard rápido: **objetivo → días por semana → split** → genera un esqueleto (PPL, Upper/Lower, Full Body, Arnold) que luego edito.
- Editor drag & drop (`dnd-kit`) para reordenar días, ejercicios y series. **Táctil de verdad**, no sólo mouse.
- Buscador de ejercicios con filtros combinables: músculo (vía **mapa corporal SVG interactivo tappable**), equipo disponible, nivel, tipo. Búsqueda fuzzy sobre nombres + alias, en español.
- Editor de series **por serie individual**: warmup vs working, rangos de reps, RPE objetivo, tempo, descanso, superseries (arrastra un ejercicio sobre otro para agruparlos).
- **Plantillas prearmadas** listas para usar (mete 4-5 clásicas bien programadas: PPL 6 días, Upper/Lower 4 días, Full Body 3 días, y una de fuerza tipo 5x5).
- Duplicar rutina, duplicar día, archivar (nunca borrar de verdad si tiene historial).
- Estimación automática de duración de la sesión (series × tempo + descansos).

### 5.3 ⭐ Workout Player (la pantalla estrella — dedícale el 40% del esfuerzo)

Flujo objetivo: **abro la app → un tap en "Empezar Push A" → todo lo demás es una sola mano y el pulgar.**

**Layout (mobile, una columna, thumb-zone):**

- **Header compacto y sticky:** nombre del día, progreso `3/7 ejercicios`, cronómetro total de la sesión, botón de salir.
- **Card del ejercicio actual (protagonista):**
  - **Video en loop, autoplay, muted, `playsInline`**, con esquinas redondeadas, 16:9 o 1:1. Se reproduce solo al entrar al ejercicio y se pausa cuando sale del viewport (IntersectionObserver) para no quemar batería.
  - Tap en el video → **bottom sheet a pantalla completa** con: video más grande, controles de velocidad (0.5x/1x), instrucciones paso a paso numeradas, músculos trabajados resaltados en el SVG corporal, y errores comunes ("no rebotes en el pecho", "codos a 45°"). **Esto es "lo necesario, no un tutorial eterno".**
  - Debajo: nombre del ejercicio, equipo, y **la referencia de la última vez** ("La última vez: 4×8 @ 60 kg — RPE 8") con un badge si mejoraste.
- **Lista de series** — cada fila es una serie:
  - `[#] [tipo] [ kg ] × [ reps ] [RPE] [ ✓ ]`
  - Inputs con **steppers grandes (+/−)** que respetan el incremento configurado y el inventario de discos. **Nada de teclado numérico por defecto**; el teclado sólo aparece si haces long-press en el número.
  - Los valores vienen **pre-rellenados** con la prescripción o con lo que hiciste la última vez → en el caso feliz sólo toco ✓.
  - **Swipe** en la fila: derecha = completar, izquierda = fallar/saltar. Long-press = notas de la serie.
  - Botón para **añadir una serie extra** o convertirla en drop set sobre la marcha.
- **Al completar una serie (el momento clave):**
  1. Haptic pattern corto (`navigator.vibrate`), configurable.
  2. La fila se colapsa con un **check animado (SVG path draw + spring)** y se tiñe de verde.
  3. El anillo de progreso del ejercicio avanza con easing tipo spring.
  4. **El temporizador de descanso arranca automáticamente** en un anillo grande, sin que yo haga nada.
  5. Si es PR: **confetti contenido + toast "🔥 Nuevo PR: 80 kg × 5"** (sin exagerar, que no tape la UI, ~1.2 s).
- **Temporizador de descanso (hazlo bien, es donde fallan todas las apps):**
  - **Basado en timestamps absolutos, no en `setInterval`.** Si bloqueo la pantalla o cambio de app, al volver muestra el tiempo correcto. Recalcula en `visibilitychange`.
  - Anillo circular animado (SVG `stroke-dashoffset`) + cuenta regresiva grande y legible a un metro.
  - Botones `−15s`, `+15s`, `Saltar`.
  - Al terminar: vibración + **Web Notification** (con permiso) + sonido opcional (un beep corto y agradable, no un despertador). Deben funcionar **con la app en background**.
  - Muestra en el anillo **qué viene después** ("Siguiente: Serie 3 · objetivo 8 reps @ 60 kg") para no perder el hilo.
  - **Wake Lock API** para mantener la pantalla encendida durante la serie activa (configurable), con fallback silencioso donde no exista.
- **Navegación entre ejercicios:** swipe horizontal + barra de puntos, con **View Transitions API** (fallback a Motion). El ejercicio actual se ve grande, los otros como cards pequeñas.
- **Superseries:** se muestran agrupadas visualmente con un borde/acento común, alternando A1 → A2 sin descanso intermedio y descanso sólo al cerrar la ronda.
- **Calculadora de discos:** tap en el peso → muestra visualmente qué discos poner por lado según mi `plate_inventory` ("20 + 10 + 2.5"). Pequeño detalle, enorme utilidad real.
- **Al terminar el entrenamiento:** pantalla de resumen animada tipo "wrapped" — duración, volumen total (kg), series completadas, PRs, comparación vs. la sesión anterior del mismo día, y un botón para compartir una imagen generada. Que se sienta **una recompensa**, no un formulario.
- **Persistencia brutal:** el estado del workout activo se escribe en IndexedDB **en cada cambio**. Si se cae la app, se muere la batería o cierro el navegador, al reabrir aparece un banner **"Tienes un entrenamiento en curso — Continuar"** con todo intacto.

### 5.4 Historial y progreso

- Calendario/heatmap tipo GitHub con los días entrenados.
- Detalle de cada sesión (editable después: se me olvidó anotar algo).
- Por ejercicio: gráfica de **1RM estimado (fórmula Epley y Brzycki, muéstrame cuál usas)**, peso máximo, volumen por semana, reps totales.
- **Volumen semanal por grupo muscular** (series efectivas por músculo/semana) con marcadores de rango recomendado (MEV/MAV) — esto es lo que de verdad sirve para no estancarse.
- Tabla de PRs con la fecha y el link a la serie que lo consiguió.
- Racha de entrenamientos (streak) y adherencia (sesiones hechas / planificadas).
- Peso corporal y medidas con gráfica y media móvil de 7 días.
- **Export completo a JSON y CSV** (mis datos son míos) e import para restaurar.

### 5.5 Offline-first (arquitectura, no un parche)

- **Modelo:** IndexedDB (Dexie) es la fuente de verdad durante la sesión. Postgres es la fuente de verdad a largo plazo.
- **Outbox pattern:** cada mutación se escribe local con `clientId` (uuid v7) y se encola. Un **Background Sync** (con fallback a sync al recuperar `online`) hace POST batch a `/api/sync`.
- **Idempotencia por `clientId` UNIQUE** en la DB → reintentos infinitos sin duplicar. Resolución de conflictos **last-write-wins por `updatedAt`**, salvo en `set_logs` donde el cliente siempre gana (yo estaba ahí, el servidor no).
- **Service Worker (Serwist):**
  - Precache del app shell.
  - `CacheFirst` con expiración para media de ejercicios (`/media/exercises/*`), límite de cuota configurable (~200 MB) y purga LRU.
  - `NetworkFirst` para datos, `StaleWhileRevalidate` para el catálogo.
  - Página offline decente, no el dinosaurio.
- **Precarga inteligente:** al abrir el detalle de una rutina, botón **"Descargar para offline"** que baja los videos de todos los ejercicios de ese plan y muestra progreso + tamaño total.
- Indicador visual sutil y permanente del estado: `online` / `offline` / `N cambios pendientes`.
- **Manifest completo**: iconos maskable 192/512, `display: standalone`, `theme_color`, `orientation: portrait`, shortcuts a "Empezar entrenamiento" e "Historial".

---

## 6. DISEÑO Y ANIMACIÓN (esto es la mitad del producto)

**Dirección de arte:** oscuro por defecto, alto contraste, sensación "premium gym app". Fondo casi negro (`#0A0A0B`), superficies elevadas en grises neutros, **un único color de acento saturado** (propón 2-3 opciones: lima eléctrico, naranja quemado, cian), tipografía con números **tabulares** (Inter / Geist) porque la UI está llena de cifras que no deben bailar. Radios generosos (16-24 px), sombras suaves, y **espaciado amplio: se usa con los dedos sudados**.

**Principios de movimiento:**

- **Springs, no `ease-in-out` genérico.** Define un set de springs reutilizables (`snappy`, `smooth`, `bouncy`) en un solo módulo y úsalos en toda la app. Nada de duraciones mágicas dispersas.
- **Animar sólo `transform` y `opacity`.** Cero animación de `width`/`height`/`top` (layout thrashing). Usa `will-change` con criterio.
- Transiciones de página con **View Transitions API** (shared element: la card del ejercicio crece hacia el detalle).
- **Stagger** al montar listas (40-60 ms entre items), pero sólo la primera vez, no en cada re-render.
- **Micro-interacciones obligatorias:** press state en cada botón (scale 0.96), check de serie con SVG path drawing, anillo de descanso con pulso al llegar a los últimos 3 s, números que hacen roll-up al cambiar (tipo odómetro), pull-to-refresh con resistencia.
- **Skeletons con shimmer**, nunca spinners a pantalla completa.
- **Respeta `prefers-reduced-motion`**: sustituye por fades cortos, no por "sin nada".
- **Presupuesto de rendimiento:** todo a **60 fps en un gama media de hace 3 años**. Si una animación no llega, se simplifica. Mide con el performance profiler en throttling 4x.

**Accesibilidad (no opcional):** targets táctiles ≥ 48 px, contraste AA mínimo, focus visible, navegación por teclado en el editor, labels reales en todos los inputs, `aria-live` para el temporizador, y que todo el Workout Player sea usable con VoiceOver/TalkBack.

**Entregable de diseño:** antes de implementar, genera `docs/design-system.md` + una página `/dev/styleguide` (sólo en desarrollo) con la paleta, tipografía, springs y todos los componentes en sus estados. Enséñame screenshots de las 3 pantallas clave antes de seguir.

---

## 7. RENDIMIENTO Y HUELLA EN EL VPS

- **Presupuesto de bundle:** first load JS **< 150 KB gzip** en la ruta del Workout Player. Configura `@next/bundle-analyzer` y falla el build si se pasa.
- Imágenes con `next/image` + `sharp`, `loading="lazy"`, dimensiones explícitas (cero CLS).
- Fuentes con `next/font` (self-hosted, subset latino, `display: swap`). **Cero requests a Google Fonts.**
- Objetivo Lighthouse mobile: **Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, PWA ✓**. Corre Lighthouse CI y adjunta el reporte.
- Postgres afinado para RAM baja: `shared_buffers=256MB`, `effective_cache_size=1GB`, `max_connections=20`, connection pool de la app en **máx. 5**.
- Límites de recursos en `docker-compose`: app `mem_limit: 512m`, Postgres `mem_limit: 512m`.
- **Cero polling innecesario**: nada de `setInterval` haciendo fetch cada segundo.
- Logs en JSON a stdout, nivel configurable, **sin PII**, con rotación delegada a Docker (`max-size: 10m`, `max-file: 3`).

---

## 8. DESPLIEGUE EN COOLIFY (entregable obligatorio y funcionando)

Genera todo esto y **documenta el proceso paso a paso** en `docs/DEPLOY.md`:

1. **`Dockerfile` multi-stage** optimizado:
   - `base` (node:22-alpine) → `deps` (pnpm con cache mount) → `builder` (`next build` con `output: standalone`) → `runner`.
   - Imagen final **< 250 MB**, usuario **no-root** (`nextjs:nodejs`, uid 1001), `NODE_ENV=production`, `dumb-tini` o `--init` para señales.
   - `HEALTHCHECK` apuntando a `/api/health` (que verifique también conexión a Postgres).
   - `.dockerignore` bien hecho (sin `node_modules`, `.next`, `.git`, `data/raw`).
2. **`docker-compose.yml`** listo para pegar en Coolify (recurso tipo _Docker Compose_):
   - Servicios `app` y `db` (postgres:17-alpine) en red interna. **La DB nunca expone puerto al host.**
   - Volumen nombrado para `pgdata` y otro para `/app/media`.
   - `healthcheck` en la DB y `depends_on: condition: service_healthy`.
   - `restart: unless-stopped`.
   - **No pongas labels de Traefik**: Coolify los inyecta. Sólo declara el puerto interno y documenta que hay que configurar el dominio + SSL desde la UI de Coolify.
3. **Migraciones:** un `entrypoint.sh` que corra `drizzle-kit migrate` antes de arrancar el server, con lock para evitar carreras. **Nunca `db:push` en producción.**
4. **`.env.example`** exhaustivo y comentado: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `MEDIA_DIR`, `SEED_USERS`, `LOG_LEVEL`, `TZ=America/Mexico_City`. Explica cuáles son build-time vs runtime en Next.js (esto rompe a todo el mundo en Coolify: documéntalo bien).
5. **Backups:** script `scripts/backup.sh` que haga `pg_dump` comprimido + tar del volumen de media, con retención de 7 días, y el `cron` de ejemplo. Y el script de **restore probado**, no sólo escrito.
6. **Advertencia de build:** en un VPS de 2 vCPU, `next build` puede tumbar el servidor. Documenta las 2 opciones: (a) build en el VPS con `NODE_OPTIONS=--max-old-space-size=1536` y swap habilitado, (b) build en GitHub Actions → push a GHCR → Coolify sólo hace `pull`. **Recomienda (b) y entrega el workflow de GitHub Actions.**
7. Endpoint `/api/health` con `{ status, uptime, db: "ok", version }` para el monitor de Coolify.

---

## 9. CALIDAD Y ENTREGABLES

**Tests mínimos:**

- Unit (Vitest): cálculo de 1RM, reglas de progresión, calculadora de discos, agregación de volumen, lógica del outbox/merge de sincronización.
- Integración: `/api/sync` es **idempotente** (mismo batch 3 veces = mismos datos) y **aísla usuarios** (el usuario A no puede leer ni escribir datos de B).
- E2E (Playwright): crear rutina → iniciar sesión de entrenamiento → registrar 3 series → **cortar la red** → registrar 2 más → **restaurar red** → verificar que todo llegó sin duplicados.

**Documentación en `docs/`:**

- `README.md` — qué es, screenshots/GIF, quickstart en 5 comandos.
- `ARCHITECTURE.md` — decisiones y por qué (ADRs cortos).
- `schema.md` — ER en Mermaid.
- `DEPLOY.md` — Coolify paso a paso, con troubleshooting de los 5 errores más probables.
- `DATA-SOURCES.md` — fuentes, licencias y atribución de los ejercicios y videos.

**Git:** repo inicializado, `.gitignore` correcto, commits convencionales, una rama por fase.

---

## 10. PLAN DE FASES (propón esto y ajústalo; no lo hagas todo de un jalón)

| Fase  | Contenido                                                            | Definition of Done                                                |
| ----- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **0** | Scaffolding, Docker, Postgres local, CI, styleguide, health endpoint | `docker compose up` levanta todo y `/api/health` responde         |
| **1** | Schema + migraciones + auth de los 2 usuarios                        | Login funciona, tests de aislamiento en verde                     |
| **2** | Pipeline de ejercicios + media (el paso pesado)                      | `pnpm seed:exercises` puebla la DB y los videos se sirven locales |
| **3** | Constructor de rutinas + plantillas                                  | Puedo crear un PPL completo desde el móvil                        |
| **4** | ⭐ **Workout Player** completo con animaciones y timer               | Cumple los 6 criterios de éxito de la sección 1                   |
| **5** | Offline-first, service worker, sync, instalable                      | Test E2E de corte de red en verde                                 |
| **6** | Historial, gráficas, PRs, volumen por músculo, export                |                                                                   |
| **7** | Pulido, Lighthouse, backups, deploy real en Coolify                  | Corriendo en mi dominio con SSL                                   |

---

## 11. LO QUE **NO** QUIERO

- Nada de IA generativa, chatbots, "coach con IA" ni llamadas a APIs de terceros en runtime.
- Nada de tracking, analytics, cookies de terceros, ni telemetría.
- Nada de gamificación cursi: sin mascotas, sin monedas, sin "niveles". La satisfacción viene del **feedback físico y de ver el progreso real**, no de badges de plástico.
- Nada de social feed, likes ni comentarios.
- Nada de suscripciones, paywalls ni feature flags de pago.
- Nada de sobre-ingeniería: si dudas entre una abstracción elegante y 30 líneas legibles, elige las 30 líneas.

---

## 12. EMPIEZA ASÍ

1. Haz preguntas **sólo si algo es genuinamente ambiguo** (máximo 5, en una sola tanda).
2. Verifica con `curl` las APIs de wger y free-exercise-db y **muéstrame el shape real** de la respuesta.
3. Entrégame el **plan por fases** con el árbol de archivos propuesto y las decisiones donde te desvías de este brief.
4. Espera mi aprobación. Luego ejecuta la Fase 0.

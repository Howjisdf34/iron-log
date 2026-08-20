# Deploy — Iron Log en Coolify

Guía paso a paso para desplegar Iron Log en un VPS con Coolify ya instalado,
usando GitHub Actions para el build (CLAUDE.md §8.6, opción b) — el VPS
sólo hace `pull` de una imagen ya construida, nunca corre `next build`.

Dominio de ejemplo en esta guía: `rutinas.ohmdail.com`. Cambialo por el
tuyo donde aparezca.

## 0. Por qué build en GitHub Actions y no en el VPS

Un VPS de 2 vCPU / 4 GB RAM puede quedarse sin memoria o tardar minutos en
un `next build` (TypeScript + Turbopack + generación de páginas). Mientras
tanto el resto de los servicios del VPS sufren. La alternativa —build
local con `NODE_OPTIONS=--max-old-space-size=1536` y swap habilitado— es
posible pero frágil. Este proyecto usa GitHub Actions:

```
push a master → CI (lint/typecheck/test/build) → si pasa, build de Docker → push a GHCR
                                                                                   ↓
                                                              Coolify hace `pull` y reinicia
```

El workflow ya está en `.github/workflows/ci.yml` (jobs `quality` y
`docker-publish`). No hace falta ningún secret adicional en GitHub: usa el
`GITHUB_TOKEN` que Actions inyecta automáticamente, con permiso de escribir
paquetes (`packages: write` en el workflow).

## 1. Antes de empezar

- Repo en GitHub con el workflow ya corrido al menos una vez en `master`
  (que haya publicado `ghcr.io/<tu-usuario>/iron-log:latest`).
- Coolify corriendo en tu VPS, con acceso a la UI.
- DNS: un registro A (o CNAME) de `rutinas.ohmdail.com` apuntando a la IP
  de tu VPS. Coolify emite el certificado SSL solo (Let's Encrypt) una vez
  que el dominio resuelve — puede tardar unos minutos en propagarse.

## 2. Verificar que la imagen es pública o darle acceso a Coolify

Como el repo de GitHub es privado, el paquete en GHCR (`ghcr.io/.../iron-log`)
nace privado también. Coolify necesita credenciales para hacer `pull`. Dos
opciones:

**Opción A — hacer el paquete público (más simple):**
En GitHub → tu perfil → **Packages** → `iron-log` → **Package settings** →
**Change visibility** → **Public**. El código del repo sigue privado; sólo
la imagen Docker (sin tus datos, sin secrets) se vuelve descargable.

**Opción B — dejarlo privado y darle un token a Coolify:**
1. GitHub → **Settings** → **Developer settings** → **Personal access
   tokens (classic)** → generar uno con scope `read:packages` únicamente.
2. En Coolify: **Settings** → **Registries** (o al crear el recurso, sección
   de credenciales de registry) → agregar `ghcr.io` con tu usuario de
   GitHub y ese token como password.

Recomendado: Opción A. No hay nada sensible en la imagen (ni datos de
usuario, ni `.env`, ni la media de ejercicios — eso vive en el volumen,
aparte).

## 3. Crear el recurso en Coolify

1. **New Resource** → **Docker Compose**.
2. Pegá el contenido de `docker-compose.yml` de este repo, con un cambio:
   reemplazá el `build:` del servicio `app` por la imagen de GHCR:

   ```diff
     app:
   -   build:
   -     context: .
   -     dockerfile: Dockerfile
   +   image: ghcr.io/<tu-usuario-en-minusculas>/iron-log:latest
   ```

   (Coolify no necesita el Dockerfile si ya le das la imagen construida.)

   **`<tu-usuario>` va todo en minúsculas, aunque tu usuario de GitHub
   tenga mayúsculas.** `docker/metadata-action` publica la imagen en
   GHCR ya normalizada a minúsculas (es un requisito del formato de
   referencias de Docker), así que si tu usuario es `Howjisdf34` la
   imagen real es `ghcr.io/howjisdf34/iron-log:latest`. Usar la
   capitalización original falla en el `pull` con
   `invalid reference format: repository name ... must be lowercase`.
3. **No agregues labels de Traefik a mano** — Coolify los inyecta solo
   cuando configurás el dominio en el paso siguiente.
4. Configurá el dominio: `rutinas.ohmdail.com`, puerto interno `3000`
   (el que expone el contenedor `app`). Coolify arma el proxy y pide el
   certificado SSL automáticamente.
5. Variables de entorno — copiá `.env.example` a la sección de env vars de
   Coolify y completá los valores reales:

   | Variable | Valor en producción |
   |---|---|
   | `DATABASE_URL` | dejalo como está en `docker-compose.yml` (se arma solo desde `POSTGRES_*`, no lo pises) |
   | `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | credenciales reales, generá el password con `openssl rand -base64 24` |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `AUTH_URL` | `https://rutinas.ohmdail.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://rutinas.ohmdail.com` |
   | `MEDIA_DIR` | `/app/media` (ya seteado en `docker-compose.yml`) |
   | `SEED_USERS` | `[{"email":"vos@...","password":"...","name":"Vos"},{"email":"ella@...","password":"...","name":"Ari"}]` — sólo para el primer arranque, después podés vaciarlo |
   | `LOG_LEVEL` | `info` |
   | `TZ` | `America/Mexico_City` |

6. **Deploy**. Coolify baja la imagen, levanta `db` y `app`, espera el
   healthcheck de `db` y recién ahí arranca `app`.

## 4. Verificar que arrancó bien

```
curl https://rutinas.ohmdail.com/api/health
# {"status":"ok","uptime":...,"db":"ok","version":"0.1.0"}
```

Si `SEED_USERS` tenía algo, ya podés entrar con esas credenciales en
`https://rutinas.ohmdail.com/login`. Si no, corré `pnpm user:create` desde
tu máquina apuntando el `DATABASE_URL` al VPS, o entrá al contenedor desde
la UI de Coolify y corré el script ahí.

## 5. Sembrar el catálogo de ejercicios

`pnpm seed:exercises` no corre en producción (necesita `ffmpeg` y red hacia
wger/GitHub, y tarda). Corrélo **una vez**, desde tu máquina, apuntando al
Postgres del VPS:

```bash
DATABASE_URL="postgresql://usuario:password@rutinas.ohmdail.com:5432/ironlog" \
MEDIA_DIR="./media-export" \
pnpm seed:exercises
```

Como `docker-compose.yml` nunca expone el puerto de `db` al host (a
propósito), esto en la práctica significa: o abrís un túnel SSH temporal al
puerto 5432 del contenedor `db`, o corrés el seed **dentro** del VPS. Más
simple: hacelo una sola vez en tu máquina de desarrollo contra la DB local,
y subí la media resultante junto con un `pg_dump`/`pg_restore` de la tabla
`exercises` al VPS — o, más directo todavía, restaurá el `db-*.sql.gz` de
un backup que ya tenga el catálogo sembrado (ver más abajo) y copiá la
carpeta `media/` con `scp`/`rsync` al volumen `media` del VPS.

## 6. Backups

`scripts/backup.sh` hace `pg_dump --clean` comprimido + `tar` de la media,
con retención de 7 días. Requiere que `db` y `app` estén corriendo.

```bash
./scripts/backup.sh /var/backups/iron-log
```

Cron de ejemplo en el VPS (todos los días a las 3am):

```cron
0 3 * * * cd /ruta/al/proyecto && ./scripts/backup.sh /var/backups/iron-log >> /var/log/iron-log-backup.log 2>&1
```

**Restaurar** (probado de verdad, no sólo escrito — ver ADR-023 en
`docs/ARCHITECTURE.md`):

```bash
./scripts/restore.sh /var/backups/iron-log/db-20260301-030000.sql.gz \
                      /var/backups/iron-log/media-20260301-030000.tar.gz
```

Pide escribir `restaurar` para confirmar — reemplaza TODA la base de datos
y TODA la media actuales, no hay vuelta atrás.

## 7. Troubleshooting — los 5 errores más probables

**1. "database ... does not exist" o la app no conecta a la DB al arrancar.**
`DATABASE_URL` está mal armada. Dentro de `docker-compose.yml`, `app` usa
`db` (DNS interno de Compose) como host — nunca `localhost` ni la IP
pública del VPS. Si pegaste tu `.env` local de desarrollo (que apunta a
`localhost:5433`) directo en Coolify, vas a tener este problema. Dejá que
`docker-compose.yml` arme la URL solo a partir de `POSTGRES_*` (ver ADR-008
en ARCHITECTURE.md).

**2. Coolify no puede bajar la imagen de GHCR ("unauthorized" / "denied").**
El paquete es privado y Coolify no tiene credenciales — ver paso 2 de esta
guía. Sintoma típico: el deploy se queda colgado en "Pulling image" y
después falla.

**3. El certificado SSL no se emite.**
El DNS todavía no propagó, o el puerto 80 está bloqueado (Let's Encrypt
necesita el challenge HTTP). Verificá con `dig rutinas.ohmdail.com` que
resuelve a la IP correcta antes de reintentar el deploy en Coolify.

**4. `AUTH_SECRET`/`NEXT_PUBLIC_APP_URL` cambiaron pero el login sigue roto.**
`NEXT_PUBLIC_APP_URL` es **build-time** (se congela en la imagen de GHCR) —
cambiarla en Coolify sin rebuildear no hace nada. `AUTH_SECRET`/`AUTH_URL`
sí son runtime, alcanza con reiniciar el contenedor. Si tocaste la
build-time, hace falta un nuevo push a `master` (o re-disparar el workflow)
para que el próximo `:latest` la tenga.

**5. Permisos al restaurar un backup de media ("Permission denied").**
El contenedor corre como usuario `nextjs` (no-root, uid 1001). Si el
volumen de media tiene archivos de un dueño distinto (por ejemplo, quedaron
de una versión vieja de la imagen que corría distinto), el `rm -rf` falla.
`scripts/restore.sh` ya corre ese paso como `root` dentro del contenedor
(`docker compose exec -u root`) y al final hace `chown` de vuelta a
`nextjs` — si escribiste tu propio script de restore, no te olvides de
eso (bug real, encontrado probando el script — ver ADR-023).

## 8. Qué NO está automatizado todavía

- El seed inicial del catálogo de ejercicios (paso 5) es manual.
- Los backups no se suben a almacenamiento externo (S3, etc.) — hoy viven
  sólo en el disco del VPS. Si el VPS se pierde entero, se pierden los
  backups también. Considerar `rclone` a un storage externo como mejora
  futura si el catálogo de entrenamientos crece en valor.
- El E2E de Playwright (`pnpm test:e2e`) corre local contra Docker, no en
  GitHub Actions — ver ADR-018 en ARCHITECTURE.md.

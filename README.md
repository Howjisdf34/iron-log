# Iron Log

PWA de rutinas de gimnasio con seguimiento granular por serie. Self-hosted en un VPS
propio vía Coolify, offline-first, pensada para usarse con el celular en la mano
dentro del gimnasio.

Ver el brief completo en [`CLAUDE.md`](./CLAUDE.md).

## Estado

🚧 Fase 2 — pipeline de ejercicios (wger + free-exercise-db), media local, `/creditos`.

## Quickstart (desarrollo local, `next dev` en el host)

```bash
pnpm install
cp .env.example .env
# Ajusta DATABASE_URL a localhost:5433 (puerto del overlay de dev, ver abajo)

# Postgres en Docker, expuesto en el host vía el overlay de desarrollo:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

pnpm db:migrate     # aplica drizzle/*.sql
pnpm user:create --email tu@correo.com --password "algo-largo" --name "Tú"

pnpm dev            # http://localhost:3000 — te redirige a /login
```

Para levantar todo (app + db) en contenedores, tal como corre en producción/Coolify —
migraciones y seed de usuarios corren solos al arrancar (`src/instrumentation.ts`):

```bash
docker compose up --build
```

`/api/health` debe responder `{ status: "ok", db: "ok", ... }` una vez que ambos
servicios estén arriba. La DB **no** expone puerto al host en este modo (a propósito).

## Scripts

| Comando                     | Qué hace                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                  | servidor de desarrollo                                          |
| `pnpm build` / `pnpm start` | build + server de producción                                    |
| `pnpm lint`                 | ESLint                                                          |
| `pnpm typecheck`            | `tsc --noEmit`                                                  |
| `pnpm test`                 | Vitest (unit, rápido, sin DB)                                   |
| `pnpm test:integration`     | Vitest contra Postgres real (aislamiento por usuario)           |
| `pnpm format`               | Prettier (escribe)                                              |
| `pnpm db:generate`          | genera una migración a partir del schema                        |
| `pnpm db:migrate`           | aplica migraciones pendientes                                   |
| `pnpm db:studio`            | explorador visual de la DB (Drizzle Studio)                     |
| `pnpm user:create`          | crea uno de los 2 usuarios (sin registro público)               |
| `pnpm seed:exercises`       | puebla el catálogo de ejercicios + descarga/transcodifica media |

`pnpm seed:exercises` acepta `--limit=N` (probar rápido con pocos ejercicios),
`--skip-media` (sólo DB, sin ffmpeg) y `--force-fetch` (ignora el cache de
`data/raw/`). Requiere `ffmpeg` en el PATH — ver `FFMPEG_PATH` en `.env.example` si
no está en el PATH del sistema. Tarda ~30-60 min sin `--limit` (873 ejercicios, ~78
con video real). Detalle completo en [`docs/DATA-SOURCES.md`](./docs/DATA-SOURCES.md).

## Stack

Next.js (App Router, `output: standalone`) · TypeScript strict · Tailwind + shadcn/ui ·
Motion · TanStack Query · Zustand · PostgreSQL 17 + Drizzle ORM · Dexie (offline) ·
Auth.js v5 · Serwist (PWA/SW). Detalle completo y justificación en `CLAUDE.md` §2.

## Documentación

- [`docs/design-system.md`](./docs/design-system.md) — paleta, tipografía, springs.
  Vista viva en `/dev/styleguide` (sólo desarrollo).
- [`docs/schema.md`](./docs/schema.md) — diagrama ER completo (Mermaid).
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — decisiones técnicas (ADRs cortos).
- `docs/DEPLOY.md` — despliegue en Coolify (Fase 7).
- `docs/DATA-SOURCES.md` — fuentes y licencias de ejercicios/media (Fase 2).

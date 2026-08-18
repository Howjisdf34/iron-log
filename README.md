# Iron Log

PWA de rutinas de gimnasio con seguimiento granular por serie. Self-hosted en un VPS
propio vía Coolify, offline-first, pensada para usarse con el celular en la mano
dentro del gimnasio.

Ver el brief completo en [`CLAUDE.md`](./CLAUDE.md).

## Estado

🚧 Fase 0 — scaffolding, Docker, styleguide, health endpoint.

## Quickstart

```bash
pnpm install
cp .env.example .env      # ajusta valores si no usas los defaults de docker-compose
docker compose up -d db   # sólo Postgres, para desarrollar la app con `next dev`
pnpm dev                  # http://localhost:3000
```

Para levantar todo (app + db) en contenedores, tal como corre en producción:

```bash
docker compose up --build
```

`/api/health` debe responder `{ status: "ok", db: "ok", ... }` una vez que ambos
servicios estén arriba.

## Scripts

| Comando                     | Qué hace                     |
| --------------------------- | ---------------------------- |
| `pnpm dev`                  | servidor de desarrollo       |
| `pnpm build` / `pnpm start` | build + server de producción |
| `pnpm lint`                 | ESLint                       |
| `pnpm typecheck`            | `tsc --noEmit`               |
| `pnpm test`                 | Vitest (unit)                |
| `pnpm format`               | Prettier (escribe)           |

## Stack

Next.js (App Router, `output: standalone`) · TypeScript strict · Tailwind + shadcn/ui ·
Motion · TanStack Query · Zustand · PostgreSQL 17 + Drizzle ORM · Dexie (offline) ·
Auth.js v5 · Serwist (PWA/SW). Detalle completo y justificación en `CLAUDE.md` §2.

## Documentación

- [`docs/design-system.md`](./docs/design-system.md) — paleta, tipografía, springs.
  Vista viva en `/dev/styleguide` (sólo desarrollo).
- `docs/schema.md` — diagrama ER (Fase 1).
- `docs/DEPLOY.md` — despliegue en Coolify (Fase 7).
- `docs/DATA-SOURCES.md` — fuentes y licencias de ejercicios/media (Fase 2).
- `docs/ARCHITECTURE.md` — decisiones técnicas (ADRs cortos).

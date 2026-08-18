import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest no carga .env solo — a diferencia de Next.js. drizzle-kit sí lo
// hace, así que sin esto `pnpm db:migrate` funciona pero los tests fallan
// con un error de auth confuso ("password must be a string").
if (existsSync(path.resolve(import.meta.dirname, ".env"))) {
  process.loadEnvFile(".env");
}

/**
 * Tests que pegan contra Postgres real (aislamiento por userId, sync
 * idempotente). Requieren DATABASE_URL apuntando a una DB con las
 * migraciones aplicadas — `docker compose up -d db && pnpm db:migrate`.
 * Separados de `pnpm test` para no acoplar el ciclo rápido de unit tests
 * a tener la DB arriba.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 20_000,
  },
});

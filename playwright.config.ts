import { defineConfig, devices } from "@playwright/test";

// Los tests importan src/db directo (mismo patrón que los tests de
// integración de Vitest) para preparar datos reales — necesitan
// DATABASE_URL antes de que Playwright spawnee los workers, que heredan
// el `process.env` de este proceso de config.
process.loadEnvFile();

/**
 * E2E contra el stack Docker real (Dockerfile + docker-compose.yml), no
 * `next dev` ni un `next start` suelto — el service worker (src/app/sw.ts)
 * sólo existe en un build de producción, y `output: "standalone"` (ADR-001)
 * no corre con `next start` de todas formas. Levantar Docker acá evita
 * además un EPERM de Windows con symlinks de pnpm dentro de
 * `.next/standalone` al correr el server suelto (ver ADR-018).
 *
 * Requiere Docker corriendo y la DB de dev levantada antes de:
 *   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
 */
const dockerBin = "C:\\Program Files\\Docker\\Docker\\resources\\bin";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { PATH: `${process.env.PATH ?? ""};${dockerBin}` },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

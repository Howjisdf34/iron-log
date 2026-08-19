/**
 * Bundlea src/app/sw.ts -> public/sw.js con esbuild.
 *
 * `@serwist/next` normalmente hace esto vía un plugin de webpack, pero
 * este proyecto usa Turbopack desde la Fase 0 y ambos no son compatibles
 * (ver ADR-017 en docs/ARCHITECTURE.md). esbuild bundlea el service worker
 * como un paso aparte, después de `next build` — mismo patrón que
 * transcodificar media en el seed: una herramienta de build dedicada, no
 * el bundler principal de la app.
 */
import { build } from "esbuild";
import { resolve } from "node:path";

async function main() {
  await build({
    entryPoints: [resolve(process.cwd(), "src/app/sw.ts")],
    outfile: resolve(process.cwd(), "public/sw.js"),
    bundle: true,
    minify: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "info",
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

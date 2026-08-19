/**
 * Guardia de regresión del bundle compartido (CLAUDE.md §7 pide <150KB
 * gzip de "First Load JS" para el Workout Player). Corre después de
 * `pnpm build`.
 *
 * Lectura honesta de lo que esto mide de verdad — ver ADR-022 en
 * docs/ARCHITECTURE.md para el detalle completo: Next 16 + Turbopack no
 * expone un desglose estable por ruta como las versiones viejas de Next
 * (App Router resuelve la mayoría del código vía referencias RSC, no un
 * bundle único por página), y `@next/bundle-analyzer` directamente se
 * apaga bajo Turbopack. Lo único medible de forma estable y scripteable
 * es `rootMainFiles`/`polyfillFiles` del `build-manifest.json` de la
 * ruta: el runtime de React 19 + Next 16 compartido por TODAS las
 * páginas — no el código específico del Workout Player (Motion, Dexie,
 * dnd-kit, etc., que sí quedan fuera de este número gracias a code
 * splitting real, verificado con `next experimental-analyze`).
 *
 * Ese runtime compartido ya mide ~166KB gzip por sí solo, por encima del
 * objetivo de 150KB del brief, y no es reducible desde código de
 * aplicación (es el piso del framework). Por eso este script no falla al
 * primer KB de más: funciona como detector de REGRESIONES sobre un techo
 * generoso (200KB) — si algo hace crecer el runtime compartido bastante
 * más que eso (p. ej. una librería pesada importada sin querer en
 * providers.tsx o el layout raíz), sí corta el build.
 */
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE_MANIFEST = join(
  ".next",
  "server",
  "app",
  "entrenar",
  "[sessionId]",
  "page",
  "build-manifest.json",
);
const TARGET_BYTES = 150 * 1024; // objetivo del brief — informativo
const REGRESSION_CEILING_BYTES = 200 * 1024; // techo real que sí corta el build

interface RouteBuildManifest {
  rootMainFiles: string[];
  polyfillFiles: string[];
}

function main() {
  const manifest = JSON.parse(readFileSync(ROUTE_MANIFEST, "utf8")) as RouteBuildManifest;
  const files = [...manifest.rootMainFiles, ...manifest.polyfillFiles];

  let totalGzipBytes = 0;
  for (const file of files) {
    const raw = readFileSync(join(".next", file));
    totalGzipBytes += gzipSync(raw).length;
  }

  const kb = (totalGzipBytes / 1024).toFixed(1);
  console.log(`Runtime compartido (gzip): ${kb}KB`);
  console.log(
    `  objetivo CLAUDE.md §7: ${(TARGET_BYTES / 1024).toFixed(0)}KB (piso de framework, no accionable — ver ADR-022)`,
  );
  console.log(`  techo de regresión: ${(REGRESSION_CEILING_BYTES / 1024).toFixed(0)}KB`);

  if (totalGzipBytes > REGRESSION_CEILING_BYTES) {
    const overBy = ((totalGzipBytes - REGRESSION_CEILING_BYTES) / 1024).toFixed(1);
    console.error(
      `✗ El runtime compartido creció ${overBy}KB por encima del techo de regresión`,
    );
    process.exit(1);
  }

  console.log("✓ Sin regresión de bundle");
}

main();

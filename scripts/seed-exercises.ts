/**
 * pnpm seed:exercises [--limit=N] [--skip-media] [--force-fetch] [--force-media]
 *
 * Idempotente y reanudable: JSON crudo cacheado en data/raw/, media cacheada
 * en data/raw/media-cache/ y en MEDIA_DIR — correrlo de nuevo no vuelve a
 * bajar ni transcodificar lo que ya existe. Ver docs/DATA-SOURCES.md.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../src/db";
import { fetchAllWgerExercises, fetchWgerMuscles } from "../src/server/seed/wger-client";
import {
  buildFreeExerciseDbIndex,
  fetchFreeExerciseDb,
} from "../src/server/seed/free-exercise-db-client";
import { normalizeExercise } from "../src/server/seed/normalize";
import { processExerciseMedia } from "../src/server/seed/media-pipeline";
import { upsertCatalogs, upsertExercise } from "../src/server/seed/upsert";

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  return {
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    skipMedia: flags.has("--skip-media"),
    forceFetch: flags.has("--force-fetch"),
  };
}

async function main() {
  const { limit, skipMedia, forceFetch } = parseArgs(process.argv.slice(2));
  const dataRawDir = join(process.cwd(), "data", "raw");
  const rawCacheDir = join(dataRawDir, "media-cache");
  const mediaDir = process.env.MEDIA_DIR
    ? join(process.cwd(), process.env.MEDIA_DIR)
    : join(process.cwd(), "media");

  await mkdir(dataRawDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });

  console.log("=== 1/5 catálogos de wger ===");
  const wgerMuscles = await fetchWgerMuscles();
  const lookup = await upsertCatalogs(db, wgerMuscles);
  console.log(
    `equipment: ${lookup.equipmentBySlug.size}, muscles: ${lookup.muscleBySlug.size}`,
  );

  console.log("=== 2/5 dataset de wger (exerciseinfo) ===");
  const wgerExercises = await fetchAllWgerExercises(
    join(dataRawDir, "wger-exercises.json"),
    forceFetch,
  );

  console.log("=== 3/5 dataset de free-exercise-db (fallback) ===");
  const feDb = await fetchFreeExerciseDb(
    join(dataRawDir, "free-exercise-db.json"),
    forceFetch,
  );
  const feDbIndex = buildFreeExerciseDbIndex(feDb);

  const pool = limit ? wgerExercises.slice(0, limit) : wgerExercises;
  console.log(`=== 4/5 normalizando + media (${pool.length} ejercicios) ===`);

  const takenSlugs = new Set<string>();
  let withVideo = 0;
  let withImageLoop = 0;
  let withoutMedia = 0;
  let needsTranslationCount = 0;

  for (let i = 0; i < pool.length; i += 1) {
    const wgerExercise = pool[i]!;
    const normalized = normalizeExercise(wgerExercise, feDbIndex, takenSlugs);
    if (normalized.needsTranslation) needsTranslationCount += 1;

    const media = skipMedia
      ? []
      : await processExerciseMedia(normalized, mediaDir, rawCacheDir);

    if (media.some((m) => m.type === "video")) withVideo += 1;
    else if (media.some((m) => m.type === "gif")) withImageLoop += 1;
    else withoutMedia += 1;

    await upsertExercise(db, normalized, media, lookup);

    process.stdout.write(
      `\r[${i + 1}/${pool.length}] video:${withVideo} loop:${withImageLoop} sin-media:${withoutMedia}   `,
    );
  }
  process.stdout.write("\n");

  console.log("=== 5/5 resumen ===");
  console.log(`total: ${pool.length}`);
  console.log(`con video: ${withVideo}`);
  console.log(`con loop de 2 imágenes: ${withImageLoop}`);
  console.log(`sin media (placeholder en runtime): ${withoutMedia}`);
  console.log(`needsTranslation: ${needsTranslationCount}`);
}

main()
  .then(() => {
    console.log("listo.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });

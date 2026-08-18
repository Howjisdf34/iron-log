/**
 * pnpm exec tsx --env-file=.env scripts/export-sample.ts
 * Exporta ~30 ejercicios diversos (mezcla de categorías y de los 3 casos de
 * media) a data/exercises.sample.json — fixture para tests/dev sin red.
 * Correr después de un `pnpm seed:exercises` real.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { exerciseMedia, exercises } from "../src/db/schema";

const PER_BUCKET = 12;

async function main() {
  const withVideo = await db
    .select({ id: exercises.id })
    .from(exercises)
    .innerJoin(exerciseMedia, sql`${exerciseMedia.exerciseId} = ${exercises.id}`)
    .where(sql`${exerciseMedia.type} = 'video'`)
    .limit(PER_BUCKET);

  const withLoop = await db
    .select({ id: exercises.id })
    .from(exercises)
    .innerJoin(exerciseMedia, sql`${exerciseMedia.exerciseId} = ${exercises.id}`)
    .where(sql`${exerciseMedia.type} = 'gif'`)
    .limit(PER_BUCKET);

  const withoutMedia = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      sql`not exists (select 1 from ${exerciseMedia} where ${exerciseMedia.exerciseId} = ${exercises.id})`,
    )
    .limit(PER_BUCKET);

  const ids = [...withVideo, ...withLoop, ...withoutMedia].map((r) => r.id);
  if (ids.length === 0) {
    console.error("No hay ejercicios en la DB — corre `pnpm seed:exercises` primero.");
    process.exit(1);
  }

  const rows = await db.query.exercises.findMany({
    where: (e, { inArray }) => inArray(e.id, ids),
    with: { media: true, aliases: true, equipment: true },
  });

  const outPath = join(process.cwd(), "data", "exercises.sample.json");
  await writeFile(outPath, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`${rows.length} ejercicios exportados a ${outPath}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

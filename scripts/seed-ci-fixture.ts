/**
 * Seed mínimo y sin red para CI. `pnpm test:integration` corre contra una
 * DB de Postgres recién creada por el servicio de GitHub Actions —
 * `pnpm db:migrate` sólo aplica el schema, no puebla el catálogo de
 * ejercicios. Los tests de integración de rutinas/workout/historial
 * necesitan que ciertos slugs existan (los que usan las plantillas de
 * `ROUTINE_TEMPLATES`) — esto los inserta con datos mínimos, sin tocar
 * wger/free-exercise-db/ffmpeg (eso es `pnpm seed:exercises`, real pero
 * lento y de red, sólo para desarrollo).
 *
 * Se derivan los slugs de ROUTINE_TEMPLATES en vez de mantener una lista
 * a mano, para no desincronizarse si una plantilla cambia (bug real,
 * encontrado en el primer run de CI — ver ADR-028 en docs/ARCHITECTURE.md).
 */
import { db } from "../src/db";
import { equipment, exercises, muscles } from "../src/db/schema";
import { ROUTINE_TEMPLATES } from "../src/server/routines/templates";

async function main() {
  const slugs = [
    ...new Set(
      ROUTINE_TEMPLATES.flatMap((t) =>
        t.days.flatMap((d) => d.exercises.map((e) => e.exerciseSlug)),
      ),
    ),
  ];

  const [existing] = await db.select({ id: exercises.id }).from(exercises).limit(1);
  if (existing) {
    console.log("Ya hay ejercicios en la DB — no se toca (¿corriste esto contra dev?).");
    process.exit(0);
  }

  const [equip] = await db
    .insert(equipment)
    .values({
      slug: "fixture-barbell",
      nameEs: "Barra (fixture)",
      nameEn: "Barbell (fixture)",
    })
    .returning({ id: equipment.id });
  const [muscle] = await db
    .insert(muscles)
    .values({
      slug: "fixture-chest",
      nameEs: "Pecho (fixture)",
      nameEn: "Chest (fixture)",
      isFront: true,
    })
    .returning({ id: muscles.id });

  await db.insert(exercises).values(
    slugs.map((slug) => ({
      slug,
      nameEs: slug,
      nameEn: slug,
      category: "compound" as const,
      equipmentId: equip!.id,
      primaryMuscles: [muscle!.id],
      source: "ci-fixture",
    })),
  );

  console.log(
    `Fixture de CI: ${slugs.length} ejercicios sembrados (sin media, sólo para tests).`,
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

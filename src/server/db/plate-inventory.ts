import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { plateInventory, type PlateInventory } from "@/db/schema";
import type { UpdatePlateInventoryInput } from "@/lib/validation/workout";

/** Set de discos de gimnasio comercial típico — punto de partida editable, no data inventada del usuario. */
const DEFAULT_PLATES: Record<string, number> = {
  "20": 4,
  "15": 2,
  "10": 2,
  "5": 2,
  "2.5": 2,
  "1.25": 2,
};

export async function getOrCreatePlateInventoryForUser(
  db: Database,
  userId: string,
): Promise<PlateInventory> {
  const [existing] = await db
    .select()
    .from(plateInventory)
    .where(eq(plateInventory.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(plateInventory)
    .values({ userId, barWeightKg: "20", platesAvailable: DEFAULT_PLATES })
    .onConflictDoNothing({ target: plateInventory.userId })
    .returning();
  if (created) return created;

  // Carrera con otra request concurrente que ya insertó — leer lo que quedó.
  const [row] = await db
    .select()
    .from(plateInventory)
    .where(eq(plateInventory.userId, userId))
    .limit(1);
  return row!;
}

export async function updatePlateInventoryForUser(
  db: Database,
  userId: string,
  input: UpdatePlateInventoryInput,
): Promise<PlateInventory> {
  await getOrCreatePlateInventoryForUser(db, userId);
  const [updated] = await db
    .update(plateInventory)
    .set({
      barWeightKg: String(input.barWeightKg),
      platesAvailable: input.platesAvailable,
      unit: input.unit,
      hasMicroplates: input.hasMicroplates,
    })
    .where(eq(plateInventory.userId, userId))
    .returning();
  return updated!;
}

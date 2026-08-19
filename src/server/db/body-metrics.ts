import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { bodyMetrics, type BodyMetric } from "@/db/schema";
import type { BodyMetricInput } from "@/lib/validation/history";

export async function listBodyMetricsForUser(
  db: Database,
  userId: string,
  limit = 180,
): Promise<BodyMetric[]> {
  return db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(desc(bodyMetrics.date))
    .limit(limit);
}

export async function upsertBodyMetricForUser(
  db: Database,
  userId: string,
  input: BodyMetricInput,
): Promise<BodyMetric> {
  const [existing] = await db
    .select({ id: bodyMetrics.id })
    .from(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.date, input.date)))
    .limit(1);

  const values = {
    weightKg: input.weightKg != null ? String(input.weightKg) : null,
    bodyFatPct: input.bodyFatPct != null ? String(input.bodyFatPct) : null,
    chest: input.chest != null ? String(input.chest) : null,
    waist: input.waist != null ? String(input.waist) : null,
    arm: input.arm != null ? String(input.arm) : null,
    thigh: input.thigh != null ? String(input.thigh) : null,
  };

  if (existing) {
    const [updated] = await db
      .update(bodyMetrics)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(bodyMetrics.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(bodyMetrics)
    .values({ userId, date: input.date, ...values })
    .returning();
  return created!;
}

export async function deleteBodyMetricForUser(
  db: Database,
  userId: string,
  metricId: string,
): Promise<void> {
  await db
    .delete(bodyMetrics)
    .where(and(eq(bodyMetrics.id, metricId), eq(bodyMetrics.userId, userId)));
}

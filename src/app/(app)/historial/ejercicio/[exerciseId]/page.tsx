import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { requireUserId } from "@/server/auth/session";
import { getExerciseHistoryForUser } from "@/server/db/exercise-progress";
import {
  estimatedOneRepMaxOverTime,
  maxWeightOverTime,
  weeklyVolume,
} from "@/lib/exercise-progress";
import {
  MaxWeightChart,
  OneRepMaxChart,
  VolumeChart,
} from "@/components/history/exercise-progress-charts";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function ExerciseProgressPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const userId = await requireUserId();

  const [exercise] = await db
    .select({ id: exercises.id, nameEs: exercises.nameEs })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);
  if (!exercise) notFound();

  const points = await getExerciseHistoryForUser(db, userId, exerciseId);
  const oneRepMax = estimatedOneRepMaxOverTime(points);
  const maxWeight = maxWeightOverTime(points);
  const volume = weeklyVolume(points);

  let bestSet: { weightKg: number; reps: number } | null = null;
  for (const p of points) {
    if (p.weightKg == null || p.reps == null) continue;
    if (!bestSet || p.weightKg * p.reps > bestSet.weightKg * bestSet.reps) {
      bestSet = { weightKg: p.weightKg, reps: p.reps };
    }
  }
  const latestOneRepMax = oneRepMax.at(-1)?.epley ?? null;

  return (
    <main className="mx-auto max-w-2xl px-[22px] pt-[18px] pb-[30px]">
      <Link
        href="/historial"
        className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground"
      >
        <ArrowLeft className="size-4" /> {exercise.nameEs}
      </Link>

      {points.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Todavía no registraste series de este ejercicio.
        </p>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-x-px overflow-hidden rounded-2xl bg-border">
            <div className="space-y-0.5 bg-background px-1 py-3">
              <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                1RM est.
              </p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {latestOneRepMax != null ? `${latestOneRepMax} kg` : "—"}
              </p>
            </div>
            <div className="space-y-0.5 bg-background px-1 py-3">
              <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                Mejor serie
              </p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {bestSet ? `${bestSet.weightKg}×${bestSet.reps}` : "—"}
              </p>
            </div>
          </section>

          <section className="mt-8 space-y-2">
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              1RM estimado (Epley/Brzycki)
            </h2>
            <OneRepMaxChart data={oneRepMax} />
          </section>
          <section className="mt-8 space-y-2">
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Peso máximo
            </h2>
            <MaxWeightChart data={maxWeight} />
          </section>
          <section className="mt-8 space-y-2">
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Volumen semanal
            </h2>
            <VolumeChart data={volume} />
          </section>
        </>
      )}
    </main>
  );
}

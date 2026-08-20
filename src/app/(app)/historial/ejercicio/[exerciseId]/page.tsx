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

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6 pb-24">
      <Link
        href="/historial"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Historial
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{exercise.nameEs}</h1>

      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no registraste series de este ejercicio.
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              1RM estimado (Epley/Brzycki)
            </h2>
            <OneRepMaxChart data={oneRepMax} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Peso máximo</h2>
            <MaxWeightChart data={maxWeight} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Volumen semanal
            </h2>
            <VolumeChart data={volume} />
          </section>
        </>
      )}
    </main>
  );
}

import Link from "next/link";
import { Trophy } from "lucide-react";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { listCompletedSessionsForUser } from "@/server/db/history";
import { listPersonalRecordsForUser } from "@/server/db/personal-records";
import { getMuscleSetPointsForUser } from "@/server/db/muscle-volume";
import { listMuscles } from "@/server/db/exercises";
import { getTrainingOverviewForUser } from "@/server/history/overview";
import { weeklyMuscleVolume } from "@/lib/muscle-volume";
import { isoWeekKey } from "@/lib/date-buckets";
import { Badge } from "@/components/ui/badge";
import { TrainingHeatmap } from "@/components/history/heatmap";
import { MuscleVolumeChart } from "@/components/history/muscle-volume-chart";

export const metadata = { title: "Historial — Iron Log" };
export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

function formatSessionDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function HistorialPage() {
  const userId = await requireUserId();
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setUTCDate(eightWeeksAgo.getUTCDate() - 8 * 7);

  const [overview, sessions, prs, muscleSetPoints, muscles] = await Promise.all([
    getTrainingOverviewForUser(db, userId),
    listCompletedSessionsForUser(db, userId, 15),
    listPersonalRecordsForUser(db, userId),
    getMuscleSetPointsForUser(db, userId, eightWeeksAgo),
    listMuscles(db),
  ]);

  const muscleNameById = new Map(muscles.map((m) => [m.id, m.nameEs]));
  const currentWeekKey = isoWeekKey(new Date(todayKey));
  const thisWeekVolume = weeklyMuscleVolume(muscleSetPoints)
    .filter((v) => v.week === currentWeekKey)
    .map((v) => ({
      muscleName: muscleNameById.get(v.muscleId) ?? v.muscleId,
      effectiveSets: Math.round(v.effectiveSets * 2) / 2,
    }))
    .sort((a, b) => b.effectiveSets - a.effectiveSets);

  const recentPrs = prs.slice(0, 8);

  return (
    <main className="mx-auto max-w-2xl px-[22px] pt-[18px] pb-[30px]">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-foreground">
        Historial
      </h1>

      <section className="mt-6 grid grid-cols-2 gap-x-px overflow-hidden rounded-2xl bg-border">
        <div className="space-y-0.5 bg-background px-1 py-3">
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Racha
          </p>
          <p className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-foreground">
            {overview.streak.current}
            <span className="ml-1 text-[15px] font-normal text-ink2">días</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Récord: {overview.streak.longest} días
          </p>
        </div>
        <div className="space-y-0.5 bg-background px-1 py-3">
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Adherencia
          </p>
          <p className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-foreground">
            {overview.adherencePct != null ? overview.adherencePct : "—"}
            {overview.adherencePct != null ? (
              <span className="ml-1 text-[15px] font-normal text-ink2">%</span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">vs. días/semana de tu rutina</p>
        </div>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Últimos meses
        </h2>
        <TrainingHeatmap trainingDates={overview.trainingDates} todayKey={todayKey} />
      </section>

      {thisWeekVolume.length > 0 ? (
        <section className="mt-8 space-y-2">
          <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Volumen por músculo esta semana
          </h2>
          <MuscleVolumeChart data={thisWeekVolume} />
        </section>
      ) : null}

      {recentPrs.length > 0 ? (
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            <Trophy className="size-3.5" /> Récords personales
          </h2>
          {recentPrs.map((pr) => (
            <Link
              key={pr.id}
              href={`/historial/ejercicio/${pr.exerciseId}`}
              className="flex items-center justify-between border-b border-border py-3 last:border-b-0"
            >
              <span className="text-[15px] font-medium text-foreground">
                {pr.exerciseName}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{pr.type}</Badge>
                <span className="tabular-nums text-foreground">{pr.value}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Entrenamientos recientes
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Todavía no completaste ningún entrenamiento.
          </p>
        ) : (
          sessions.map((session) => (
            <Link
              key={session.id}
              href={`/historial/${session.id}`}
              className="flex items-center justify-between border-b border-border py-4 last:border-b-0"
            >
              <div>
                <p className="text-[12px] font-medium text-muted-foreground uppercase">
                  {formatSessionDate(session.startedAt)}
                </p>
                <p className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                  {session.dayName ?? "Entrenamiento libre"}
                </p>
              </div>
              {session.totalVolumeKg ? (
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {Math.round(Number(session.totalVolumeKg))}
                  </p>
                  <p className="text-xs text-muted-foreground">volumen</p>
                </div>
              ) : null}
            </Link>
          ))
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";
import { TrainingHeatmap } from "@/components/history/heatmap";
import { MuscleVolumeChart } from "@/components/history/muscle-volume-chart";
import { ExportImportPanel } from "@/components/history/export-import-panel";

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
    <main className="mx-auto max-w-2xl space-y-8 p-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Historial</h1>
        <Link
          href="/cuerpo"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Peso corporal
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="size-4" />
            <span className="text-sm">Racha</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {overview.streak.current} <span className="text-sm font-normal">días</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Récord: {overview.streak.longest} días
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Adherencia (7 días)</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {overview.adherencePct != null ? `${overview.adherencePct}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">vs. días/semana de tu rutina</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Últimos meses</h2>
        <TrainingHeatmap trainingDates={overview.trainingDates} todayKey={todayKey} />
      </section>

      {thisWeekVolume.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Volumen por músculo esta semana
          </h2>
          <MuscleVolumeChart data={thisWeekVolume} />
        </section>
      ) : null}

      {recentPrs.length > 0 ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Trophy className="size-4" /> Records personales
          </h2>
          <div className="space-y-1">
            {recentPrs.map((pr) => (
              <Link
                key={pr.id}
                href={`/historial/ejercicio/${pr.exerciseId}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-card"
              >
                <span className="text-foreground">{pr.exerciseName}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline">{pr.type}</Badge>
                  <span className="tabular-nums">{pr.value}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Entrenamientos recientes
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no completaste ningún entrenamiento.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/historial/${session.id}`}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-card"
                >
                  <span className="text-foreground">
                    {session.dayName ?? "Entrenamiento libre"}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
                    {formatSessionDate(session.startedAt)}
                    {session.totalVolumeKg ? (
                      <Badge variant="outline">
                        {Math.round(Number(session.totalVolumeKg))}kg
                      </Badge>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Tus datos</h2>
        <ExportImportPanel />
      </section>
    </main>
  );
}

import Link from "next/link";
import { ChevronRight, Dumbbell, Play } from "lucide-react";
import { auth } from "@/server/auth";
import { startWorkoutAction } from "@/server/actions/workout";
import { db } from "@/db";
import { getActiveSessionForUser } from "@/server/db/workout-sessions";
import {
  getMostRecentRoutineForUser,
  listCompletedSessionsForUser,
} from "@/server/db/history";
import { getTrainingOverviewForUser } from "@/server/history/overview";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

const WEEKDAY_INITIAL = ["D", "L", "M", "M", "J", "V", "S"] as const;

function formatSessionDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function Home() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [activeSession, overview, recentRoutine, recentSessions] = await Promise.all([
    getActiveSessionForUser(db, userId),
    getTrainingOverviewForUser(db, userId),
    getMostRecentRoutineForUser(db, userId),
    listCompletedSessionsForUser(db, userId, 5),
  ]);

  const firstName = session?.user?.name?.split(" ")[0];
  const trainingDateSet = new Set(overview.trainingDates);
  const todayKey = new Date().toISOString().slice(0, 10);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, trained: trainingDateSet.has(key), isToday: key === todayKey };
  });
  const weeklyGoal = recentRoutine?.daysPerWeek ?? 7;
  const trainedThisWindow = last7Days.filter((d) => d.trained).length;

  return (
    <main className="mx-auto max-w-2xl px-[22px] pt-[18px] pb-[30px]">
      <p className="text-[13px] text-muted-foreground">
        {new Date().toLocaleDateString("es-MX", {
          timeZone: "UTC",
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
      <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-foreground">
        Hola,
        <br />
        {firstName ?? "Iron Log"}
      </h1>

      {activeSession ? (
        <Link
          href={`/entrenar/${activeSession.id}`}
          className="mt-[26px] flex items-center justify-between rounded-[22px] bg-primary p-[22px] text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] uppercase opacity-[.72]">
              En curso
            </p>
            <p className="text-2xl font-semibold">Continuar</p>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
            <Play className="size-5" />
          </span>
        </Link>
      ) : (
        <form action={startWorkoutAction.bind(null, null)} className="mt-[26px]">
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-[22px] bg-primary p-[22px] text-left text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] uppercase opacity-[.72]">
                Listo para entrenar
              </p>
              <p className="text-2xl font-semibold">Empezar libre</p>
            </div>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <Dumbbell className="size-5" />
            </span>
          </button>
        </form>
      )}

      <section className="mt-[30px] grid grid-cols-2 gap-x-px overflow-hidden rounded-2xl bg-border">
        <div className="space-y-0.5 bg-background px-1 py-3">
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Racha
          </p>
          <p className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-foreground">
            {overview.streak.current}
            <span className="ml-1 text-[15px] font-normal text-ink2">días</span>
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
        </div>
      </section>

      <section className="mt-[30px]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Esta semana
          </h2>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {trainedThisWindow} de {weeklyGoal}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {last7Days.map((day) => (
            <div key={day.key} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-[34px] w-full rounded-[11px]",
                  day.trained
                    ? "bg-primary"
                    : day.isToday
                      ? "bg-accent-soft"
                      : "bg-muted",
                )}
              />
              <span className="text-[11px] text-muted-foreground">
                {WEEKDAY_INITIAL[new Date(day.key).getUTCDay()]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {recentRoutine ? (
        <section className="mt-8">
          <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Tu rutina
          </h2>
          <Link
            href={`/rutinas/${recentRoutine.id}`}
            className="flex items-center justify-between border-b border-border py-4"
          >
            <p className="text-base font-medium text-foreground">{recentRoutine.name}</p>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </section>
      ) : null}

      {recentSessions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Últimos entrenos
          </h2>
          <ul>
            {recentSessions.map((s) => (
              <li key={s.id} className="border-b border-border py-4 last:border-b-0">
                <Link
                  href={`/historial/${s.id}`}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {s.dayName ?? "Entrenamiento libre"}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {formatSessionDate(s.startedAt)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[17px] font-medium text-ink2 tabular-nums">
                    {s.totalVolumeKg ? `${Math.round(Number(s.totalVolumeKg))} kg` : "—"}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

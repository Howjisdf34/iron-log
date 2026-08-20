import Link from "next/link";
import { ChevronRight, Dumbbell, Flame, Play } from "lucide-react";
import { auth } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { startWorkoutAction } from "@/server/actions/workout";
import { db } from "@/db";
import { getActiveSessionForUser } from "@/server/db/workout-sessions";
import { getMostRecentRoutineForUser } from "@/server/db/history";
import { getTrainingOverviewForUser } from "@/server/history/overview";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function Home() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [activeSession, overview, recentRoutine] = await Promise.all([
    getActiveSessionForUser(db, userId),
    getTrainingOverviewForUser(db, userId),
    getMostRecentRoutineForUser(db, userId),
  ]);

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hola{firstName ? "," : ""}</p>
          <h1 className="text-2xl font-bold text-foreground">
            {firstName ?? "Iron Log"}
          </h1>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </header>

      <Card className="gap-3">
        <p className="text-sm text-muted-foreground">
          {activeSession ? "Entrenamiento en curso" : "¿Listo para entrenar?"}
        </p>
        {activeSession ? (
          <Link
            href={`/entrenar/${activeSession.id}`}
            className={buttonVariants({ size: "touch", className: "w-full" })}
          >
            <Play className="size-4" /> Continuar entrenamiento
          </Link>
        ) : (
          <form action={startWorkoutAction.bind(null, null)}>
            <Button type="submit" size="touch" className="w-full">
              <Dumbbell className="size-4" /> Empezar entrenamiento libre
            </Button>
          </form>
        )}
      </Card>

      <section className="grid grid-cols-2 gap-3">
        <Card className="gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="size-4" />
            <span className="text-sm">Racha</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {overview.streak.current} <span className="text-sm font-normal">días</span>
          </p>
        </Card>
        <Card className="gap-1">
          <p className="text-sm text-muted-foreground">Adherencia (7 días)</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {overview.adherencePct != null ? `${overview.adherencePct}%` : "—"}
          </p>
        </Card>
      </section>

      {recentRoutine ? (
        <Card>
          <Link
            href={`/rutinas/${recentRoutine.id}`}
            className="flex items-center justify-between gap-2"
          >
            <div>
              <p className="text-sm text-muted-foreground">Tu rutina</p>
              <h2 className="text-lg font-semibold text-foreground">
                {recentRoutine.name}
              </h2>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </Card>
      ) : null}
    </main>
  );
}

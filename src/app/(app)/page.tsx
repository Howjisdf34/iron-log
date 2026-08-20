import Link from "next/link";
import { Play, Dumbbell } from "lucide-react";
import { auth } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { startWorkoutAction } from "@/server/actions/workout";
import { db } from "@/db";
import { getActiveSessionForUser } from "@/server/db/workout-sessions";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function Home() {
  const session = await auth();
  const userId = session!.user!.id!;
  const activeSession = await getActiveSessionForUser(db, userId);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">Iron Log</h1>
      <p className="text-sm text-muted-foreground">
        Sesión iniciada como{" "}
        <span className="text-foreground">{session?.user?.email}</span>
      </p>

      {activeSession ? (
        <Link
          href={`/entrenar/${activeSession.id}`}
          className={buttonVariants({ size: "touch", className: "w-full max-w-xs" })}
        >
          <Play className="size-4" /> Continuar entrenamiento
        </Link>
      ) : (
        <form action={startWorkoutAction.bind(null, null)} className="w-full max-w-xs">
          <Button type="submit" size="touch" variant="outline" className="w-full">
            <Dumbbell className="size-4" /> Entrenamiento libre
          </Button>
        </form>
      )}

      <Link
        href="/rutinas"
        className={buttonVariants({
          variant: "ghost",
          size: "touch",
          className: "w-full max-w-xs",
        })}
      >
        Ver rutinas
      </Link>

      <Link
        href="/historial"
        className={buttonVariants({
          variant: "ghost",
          size: "touch",
          className: "w-full max-w-xs",
        })}
      >
        Historial
      </Link>

      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}

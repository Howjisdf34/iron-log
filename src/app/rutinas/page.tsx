import Link from "next/link";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { listRoutinesForUser } from "@/server/db/routines";
import { buttonVariants } from "@/components/ui/button";
import { RoutineCard } from "@/components/routines/routine-card";

export const metadata = { title: "Rutinas — Iron Log" };
export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function RutinasPage() {
  const userId = await requireUserId();
  const routines = await listRoutinesForUser(db, userId);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Rutinas</h1>
        <Link href="/rutinas/nueva" className={buttonVariants({ size: "touch" })}>
          Nueva rutina
        </Link>
      </header>

      {routines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            Todavía no tenés ninguna rutina. Empezá desde una plantilla o armá la tuya.
          </p>
          <Link
            href="/rutinas/nueva"
            className={buttonVariants({ size: "touch", className: "mt-4" })}
          >
            Crear la primera
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {routines.map((routine) => (
            <li key={routine.id}>
              <RoutineCard routine={routine} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
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
    <main className="mx-auto max-w-2xl px-[22px] pt-[18px] pb-[30px]">
      <header className="flex items-center justify-between">
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-foreground">
          Rutinas
        </h1>
        <Link
          href="/rutinas/nueva"
          aria-label="Nueva rutina"
          className="flex size-11 items-center justify-center rounded-full bg-foreground text-background"
        >
          <Plus className="size-5" />
        </Link>
      </header>

      {routines.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
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
        <div className="mt-2">
          {routines.map((routine, i) => (
            <RoutineCard key={routine.id} routine={routine} isPrimary={i === 0} />
          ))}
        </div>
      )}
    </main>
  );
}

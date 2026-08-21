import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { getPlayerData } from "@/server/workout/player-data";
import { getOrCreatePlateInventoryForUser } from "@/server/db/plate-inventory";
import { getOrCreateUserSettingsForUser } from "@/server/db/user-settings";
import { WorkoutPlayer } from "@/components/workout/workout-player";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function EntrenarPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const userId = await requireUserId();
  const data = await getPlayerData(db, userId, sessionId);
  if (!data) notFound();

  if (data.status === "abandoned") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-foreground">Este entrenamiento ya terminó.</p>
        <Link href="/" className={buttonVariants({ size: "touch" })}>
          Volver al inicio
        </Link>
      </main>
    );
  }

  // Sesiones "completed" siguen renderizando WorkoutPlayer (no un dead-end):
  // terminar un entreno invoca finishSessionAction, que revalida rutas y
  // dispara un refresh automático de ESTA página — si acá cortáramos por
  // status, se desmontaría WorkoutPlayer justo cuando pone `summary` en su
  // estado local, perdiendo la pantalla de resumen. WorkoutPlayer ya sabe
  // mostrar `summary` con los datos que la propia acción de terminar
  // devolvió, así que sigue montado y el estado sobrevive al refresh.

  const [plateInventory, settings] = await Promise.all([
    getOrCreatePlateInventoryForUser(db, userId),
    getOrCreateUserSettingsForUser(db, userId),
  ]);

  return (
    <WorkoutPlayer
      initialData={data}
      settings={settings}
      plateInventory={plateInventory}
    />
  );
}

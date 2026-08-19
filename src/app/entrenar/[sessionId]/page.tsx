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

  if (data.status !== "in_progress") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-foreground">Este entrenamiento ya terminó.</p>
        <Link href="/" className={buttonVariants({ size: "touch" })}>
          Volver al inicio
        </Link>
      </main>
    );
  }

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

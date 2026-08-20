import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Routine } from "@/db/schema";
import { archiveRoutine, duplicateRoutine } from "@/server/actions/routines";

const GOAL_LABEL: Record<string, string> = {
  strength: "Fuerza",
  hypertrophy: "Hipertrofia",
  endurance: "Resistencia",
  recomp: "Recomposición",
};

export function RoutineCard({ routine }: { routine: Routine }) {
  async function handleDuplicate() {
    "use server";
    await duplicateRoutine(routine.id);
  }
  async function handleArchive() {
    "use server";
    await archiveRoutine(routine.id);
  }

  return (
    <Card className="transition-colors active:scale-[0.99]">
      <Link href={`/rutinas/${routine.id}`} className="block">
        <h2 className="text-lg font-semibold text-foreground">{routine.name}</h2>
        {routine.description ? (
          <p className="text-sm text-muted-foreground">{routine.description}</p>
        ) : null}
      </Link>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{GOAL_LABEL[routine.goal] ?? routine.goal}</Badge>
        <Badge variant="outline">{routine.daysPerWeek} días/semana</Badge>
      </div>
      <div className="flex gap-2">
        <form action={handleDuplicate}>
          <Button type="submit" size="sm" variant="outline">
            Duplicar
          </Button>
        </form>
        <form action={handleArchive}>
          <Button type="submit" size="sm" variant="ghost">
            Archivar
          </Button>
        </form>
      </div>
    </Card>
  );
}

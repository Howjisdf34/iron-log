import Link from "next/link";
import { Dumbbell, Heart, RefreshCw, TrendingUp, type LucideIcon } from "lucide-react";
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

const GOAL_ICON: Record<string, LucideIcon> = {
  strength: Dumbbell,
  hypertrophy: TrendingUp,
  endurance: Heart,
  recomp: RefreshCw,
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

  const GoalIcon = GOAL_ICON[routine.goal] ?? Dumbbell;

  return (
    <Card className="transition-colors active:scale-[0.99]">
      <Link href={`/rutinas/${routine.id}`} className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <GoalIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{routine.name}</h2>
          {routine.description ? (
            <p className="text-sm text-muted-foreground">{routine.description}</p>
          ) : null}
        </div>
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

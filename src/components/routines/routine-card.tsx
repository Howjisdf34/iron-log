import Link from "next/link";
import {
  Dumbbell,
  Heart,
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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

export function RoutineCard({
  routine,
  isPrimary = false,
}: {
  routine: Routine;
  isPrimary?: boolean;
}) {
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
    <div className="border-t border-border py-[22px] first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/rutinas/${routine.id}`} className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-foreground">{routine.name}</h2>
          <p className="text-[13px] text-muted-foreground">
            {GOAL_LABEL[routine.goal] ?? routine.goal} · {routine.daysPerWeek} días/semana
          </p>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="shrink-0 rounded-lg p-1.5 text-muted-foreground">
            <MoreHorizontal className="size-[19px]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <form action={handleDuplicate}>
              <DropdownMenuItem nativeButton render={<button type="submit" />}>
                Duplicar
              </DropdownMenuItem>
            </form>
            <form action={handleArchive}>
              <DropdownMenuItem
                variant="destructive"
                nativeButton
                render={<button type="submit" />}
              >
                Archivar
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link
        href={`/rutinas/${routine.id}`}
        className={cn(
          "mt-3 flex items-center justify-center gap-2 rounded-2xl py-[17px] text-sm font-semibold",
          isPrimary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <GoalIcon className="size-4" /> Ver rutina
      </Link>
    </div>
  );
}

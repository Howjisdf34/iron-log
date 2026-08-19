"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wrapper de drag-and-drop reutilizable — días y ejercicios lo comparten. */
export function SortableItem({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
    });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex gap-2", isDragging && "z-10 opacity-70", className)}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
        className="flex min-h-12 min-w-8 shrink-0 touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

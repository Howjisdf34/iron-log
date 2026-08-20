import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  total: number;
  /** 0-indexado. */
  current: number;
  className?: string;
}

export function StepIndicator({ total, current, className }: StepIndicatorProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`Paso ${current + 1} de ${total}`}
      className={cn("flex items-center gap-1.5", className)}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

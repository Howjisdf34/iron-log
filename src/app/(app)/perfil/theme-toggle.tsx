"use client";

import { useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { updateThemeAction } from "@/server/actions/settings";
import { cn } from "@/lib/utils";

export function ThemeToggle({ theme }: { theme: string }) {
  const [isPending, startTransition] = useTransition();
  const isDark = theme === "dark";

  function setTheme(next: "light" | "dark") {
    startTransition(() => {
      void updateThemeAction(next);
    });
  }

  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1" aria-label="Apariencia">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60",
          !isDark ? "bg-background text-foreground" : "text-muted-foreground",
        )}
      >
        <Sun className="size-4" /> Claro
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60",
          isDark ? "bg-background text-foreground" : "text-muted-foreground",
        )}
      >
        <Moon className="size-4" /> Oscuro
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Debounce de UI state (no de fetching — el fetch en sí va por TanStack
 * Query, ver ExercisePicker). El useEffect acá sólo maneja un timer.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

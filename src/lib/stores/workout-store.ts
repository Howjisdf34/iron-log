import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Estado efímero de UI del Workout Player — NO es la fuente de verdad de
 * los datos (eso vive en Postgres, leído/escrito vía Server Actions). Este
 * store sólo recuerda en qué ejercicio ibas y cuándo termina el descanso,
 * usando timestamps absolutos (`restEndsAt`) para que sobreviva a que se
 * bloquee la pantalla o se mate la pestaña — ver CLAUDE.md §5.3 sobre el
 * timer de descanso.
 *
 * Persistencia real de outbox/offline (Dexie) es Fase 5; esto es sólo un
 * "recuerda dónde ibas" liviano en localStorage.
 */
interface WorkoutStoreState {
  sessionId: string | null;
  currentExerciseIndex: number;
  restEndsAt: number | null;
  restDurationMs: number | null;
  restLabel: string | null;

  setSession: (sessionId: string) => void;
  setCurrentExerciseIndex: (index: number) => void;
  startRest: (durationMs: number, label: string | null) => void;
  adjustRest: (deltaMs: number) => void;
  clearRest: () => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutStoreState>()(
  persist(
    (set) => ({
      sessionId: null,
      currentExerciseIndex: 0,
      restEndsAt: null,
      restDurationMs: null,
      restLabel: null,

      setSession: (sessionId) => set({ sessionId, currentExerciseIndex: 0 }),
      setCurrentExerciseIndex: (index) => set({ currentExerciseIndex: index }),
      startRest: (durationMs, label) =>
        set({
          restEndsAt: Date.now() + durationMs,
          restDurationMs: durationMs,
          restLabel: label,
        }),
      adjustRest: (deltaMs) =>
        set((state) => {
          if (state.restEndsAt == null) return state;
          const newEndsAt = Math.max(Date.now(), state.restEndsAt + deltaMs);
          return {
            restEndsAt: newEndsAt,
            restDurationMs: (state.restDurationMs ?? 0) + deltaMs,
          };
        }),
      clearRest: () => set({ restEndsAt: null, restDurationMs: null, restLabel: null }),
      reset: () =>
        set({
          sessionId: null,
          currentExerciseIndex: 0,
          restEndsAt: null,
          restDurationMs: null,
          restLabel: null,
        }),
    }),
    {
      name: "iron-log-workout",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

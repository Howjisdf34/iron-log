"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerHeader } from "./player-header";
import { ExerciseCard } from "./exercise-card";
import { ExerciseDetailSheet } from "./exercise-detail-sheet";
import { SetRow, type SetRowValues } from "./set-row";
import { FocusMode } from "./focus-mode";
import type { WorkoutMode } from "./workout-mode";
import { RestTimer } from "./rest-timer";
import { PlateCalculatorSheet } from "./plate-calculator-sheet";
import { WorkoutSummary } from "./workout-summary";
import { PrToast } from "./pr-toast";
import { ExercisePicker } from "@/components/routines/exercise-picker";
import { useWorkoutStore } from "@/lib/stores/workout-store";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { triggerHaptic } from "@/lib/haptics";
import { playSetCompleteSound } from "@/lib/sound";
import { requestNotificationPermission } from "@/lib/notifications";
import { springs } from "@/lib/motion/springs";
import { newId } from "@/lib/id";
import { enqueueSetLog, flushOutbox } from "@/lib/offline/outbox";
import {
  abandonSessionAction,
  deleteSetLogAction,
  finishSessionAction,
  getExercisePlayerInfoAction,
  logSetAction,
} from "@/server/actions/workout";
import { updateWorkoutModeAction } from "@/server/actions/settings";
import type {
  PlayerData,
  PlayerExerciseSlot,
  PlayerLoggedSet,
} from "@/server/workout/player-data";
import type { FinishSessionSummary } from "@/server/workout/mutations";
import type { LogSetInput } from "@/lib/validation/workout";
import type { Exercise, PlateInventory, UserSettings } from "@/db/schema";

function optimisticLoggedSet(input: LogSetInput): PlayerLoggedSet {
  return {
    id: input.clientId,
    order: input.order,
    setType: input.setType,
    weightKg: input.weightKg ?? null,
    reps: input.reps ?? null,
    rpe: input.rpe ?? null,
    restTakenSeconds: input.restTakenSeconds ?? null,
    isPr: false,
    failed: input.failed ?? false,
    completedAt: new Date().toISOString(),
  };
}

interface WorkoutPlayerProps {
  initialData: PlayerData;
  settings: UserSettings;
  plateInventory: PlateInventory;
}

function displayCountFor(exercise: PlayerExerciseSlot, extra: number): number {
  return Math.max(exercise.prescribedSets.length, exercise.loggedSets.length, 1) + extra;
}

function findFirstIncompleteIndex(exercises: PlayerExerciseSlot[]): number {
  const idx = exercises.findIndex(
    (ex) => ex.loggedSets.length < Math.max(ex.prescribedSets.length, 1),
  );
  return idx === -1 ? Math.max(0, exercises.length - 1) : idx;
}

interface FocusTarget {
  exerciseIndex: number;
  rowIndex: number;
  totalRows: number;
}

/** Primera serie pendiente de TODA la sesión (no del ejercicio actual) — Modo Enfoque
 * navega solo, ignorando el índice de ejercicio del carrusel de Modo Lista. */
function findFocusTarget(
  exercises: PlayerExerciseSlot[],
  skippedKeys: Set<string>,
): FocusTarget | null {
  for (let i = 0; i < exercises.length; i += 1) {
    const ex = exercises[i]!;
    const totalRows = Math.max(ex.prescribedSets.length, 1);
    for (let row = ex.loggedSets.length; row < totalRows; row += 1) {
      if (!skippedKeys.has(`${ex.key}-${row}`)) {
        return { exerciseIndex: i, rowIndex: row, totalRows };
      }
    }
  }
  return null;
}

function buildRestLabel(exercise: PlayerExerciseSlot, nextRowIndex: number): string {
  const next = exercise.prescribedSets[nextRowIndex];
  if (!next) return `Siguiente: Serie ${nextRowIndex + 1}`;
  const repsLabel =
    next.targetRepsMin != null && next.targetRepsMax != null
      ? `${next.targetRepsMin}-${next.targetRepsMax}`
      : (next.targetReps ?? "?");
  const weightLabel = next.targetWeightKg != null ? ` @ ${next.targetWeightKg}kg` : "";
  return `Siguiente: Serie ${nextRowIndex + 1} · objetivo ${repsLabel} reps${weightLabel}`;
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -32 : 32, opacity: 0 }),
};

export function WorkoutPlayer({
  initialData,
  settings,
  plateInventory,
}: WorkoutPlayerProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialData.exercises);
  const [currentIndex, setCurrentIndex] = useState(() =>
    findFirstIncompleteIndex(initialData.exercises),
  );
  const [direction, setDirection] = useState(1);
  const [extraSetsByKey, setExtraSetsByKey] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<WorkoutMode>(
    settings.workoutMode === "focus" ? "focus" : "list",
  );
  const [skippedKeys, setSkippedKeys] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [plateSheetTarget, setPlateSheetTarget] = useState<number | null>(null);
  const [prToast, setPrToast] = useState<string | null>(null);
  const [prMessages, setPrMessages] = useState<string[]>([]);
  const [summary, setSummary] = useState<FinishSessionSummary | null>(null);
  const [isFinishing, startFinishing] = useTransition();

  const { sessionId: storedSessionId, setSession, reset, startRest } = useWorkoutStore();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (storedSessionId !== initialData.sessionId) {
      reset();
      setSession(initialData.sessionId);
    }
    void requestNotificationPermission();
    // Sólo al montar: reconcilia el store persistido con la sesión actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useWakeLock(settings.keepScreenAwake && summary == null);

  const current = exercises[currentIndex];
  const isFreeform = initialData.routineDayId == null;
  const completedSets = exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
  const totalSets = exercises.reduce(
    (sum, ex) => sum + displayCountFor(ex, extraSetsByKey[ex.key] ?? 0),
    0,
  );
  const focusTarget = findFocusTarget(exercises, skippedKeys);
  const focusExercise = focusTarget ? exercises[focusTarget.exerciseIndex] : undefined;

  function goTo(index: number) {
    if (index < 0 || index >= exercises.length) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }

  async function handleLogSet(
    exercise: PlayerExerciseSlot,
    rowIndex: number,
    setType: string,
    values: SetRowValues,
  ) {
    const input: LogSetInput = {
      clientId: newId(),
      sessionId: initialData.sessionId,
      exerciseId: exercise.exercise.id,
      routineSetId: null,
      order: rowIndex,
      setType: setType as LogSetInput["setType"],
      weightKg: values.weightKg,
      reps: values.reps,
      rpe: values.rpe,
      failed: values.failed,
    };

    let loggedSet: PlayerLoggedSet;
    let prTypes: ("1rm_estimated" | "weight")[] = [];

    // Sin red: encolar local, la UI no espera al servidor (CLAUDE.md §5.5).
    // Con red pero el fetch falla a mitad de camino: mismo fallback — el
    // outbox reintenta solo al volver `online` (useOutboxSync en providers.tsx).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueSetLog(input);
      loggedSet = optimisticLoggedSet(input);
    } else {
      try {
        const result = await logSetAction(input);
        loggedSet = result.setLog;
        prTypes = result.prTypes;
      } catch {
        await enqueueSetLog(input);
        loggedSet = optimisticLoggedSet(input);
        void flushOutbox();
      }
    }

    setExercises((prev) =>
      prev.map((ex) =>
        ex.key === exercise.key
          ? { ...ex, loggedSets: [...ex.loggedSets, loggedSet] }
          : ex,
      ),
    );

    if (!values.failed) {
      triggerHaptic("setComplete", settings.hapticsEnabled);
      playSetCompleteSound(settings.soundsEnabled);
      if (settings.restAutoStart) {
        const restSeconds =
          exercise.prescribedSets[rowIndex]?.restSecondsOverride ??
          exercise.restSeconds ??
          90;
        startRest(restSeconds * 1000, buildRestLabel(exercise, rowIndex + 1));
      }
    } else {
      triggerHaptic("tap", settings.hapticsEnabled);
    }

    if (prTypes.length > 0) {
      triggerHaptic("pr", settings.hapticsEnabled);
      const label = `${exercise.exercise.nameEs}: ${values.weightKg ?? "?"}kg × ${values.reps ?? "?"}`;
      setPrToast(`🔥 Nuevo PR: ${values.weightKg ?? "?"}kg × ${values.reps ?? "?"}`);
      setPrMessages((prev) => [...prev, label]);
    }
  }

  function handleModeChange(next: WorkoutMode) {
    setMode(next);
    void updateWorkoutModeAction(next);
  }

  async function handleUndoSet(exercise: PlayerExerciseSlot, loggedSet: PlayerLoggedSet) {
    await deleteSetLogAction(loggedSet.id);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.key === exercise.key
          ? { ...ex, loggedSets: ex.loggedSets.filter((s) => s.id !== loggedSet.id) }
          : ex,
      ),
    );
  }

  async function handleConfirmFreeformExercises(newExercises: Exercise[]) {
    const firstNewIndex = exercises.length;
    for (const exercise of newExercises) {
      const info = await getExercisePlayerInfoAction(initialData.sessionId, exercise.id);
      if (!info) continue;
      setExercises((prev) => [...prev, { ...info, order: prev.length }]);
    }
    setDirection(1);
    setCurrentIndex(firstNewIndex);
    setPickerOpen(false);
  }

  async function handleExit() {
    await abandonSessionAction(initialData.sessionId);
    reset();
    router.push("/");
  }

  function handleFinish() {
    if (!isOnline) return;
    startFinishing(async () => {
      const result = await finishSessionAction({ sessionId: initialData.sessionId });
      setSummary(result);
    });
  }

  function handleSummaryDone() {
    reset();
    router.push("/");
  }

  if (summary) {
    return (
      <WorkoutSummary
        summary={summary}
        prMessages={prMessages}
        dayName={initialData.dayName}
        startedAt={initialData.startedAt}
        onDone={handleSummaryDone}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <PlayerHeader
        dayName={initialData.dayName}
        startedAt={initialData.startedAt}
        completedSets={completedSets}
        totalSets={totalSets}
        onExit={handleExit}
        onFinish={handleFinish}
        isFinishing={isFinishing}
        canFinish={isOnline && initialData.status === "in_progress"}
        mode={mode}
        onModeChange={handleModeChange}
      />

      <PrToast message={prToast} onDismiss={() => setPrToast(null)} />

      {mode === "focus" ? (
        <main className="flex flex-1 flex-col px-[18px]">
          {focusTarget && focusExercise ? (
            <FocusMode
              exercise={focusExercise}
              exerciseIndex={focusTarget.exerciseIndex}
              totalExercises={exercises.length}
              rowIndex={focusTarget.rowIndex}
              totalRowsForExercise={focusTarget.totalRows}
              incrementKg={Number(settings.defaultIncrementKg)}
              onSkip={() =>
                setSkippedKeys((prev) =>
                  new Set(prev).add(`${focusExercise.key}-${focusTarget.rowIndex}`),
                )
              }
              onComplete={(values) =>
                handleLogSet(
                  focusExercise,
                  focusTarget.rowIndex,
                  focusExercise.prescribedSets[focusTarget.rowIndex]?.setType ??
                    "working",
                  values,
                )
              }
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-xl font-semibold text-foreground">
                Completaste todas las series
              </p>
              <p className="text-sm text-muted-foreground">
                Terminá el entrenamiento cuando quieras.
              </p>
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 space-y-4 p-4">
          {current ? (
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={current.key}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springs.smooth}
                className="space-y-4"
              >
                <ExerciseCard
                  exerciseName={current.exercise.nameEs}
                  media={current.media}
                  instructions={current.exercise.instructionsEs}
                  onOpenDetail={() => setDetailOpen(true)}
                />

                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {current.exercise.nameEs}
                  </h2>
                  {current.supersetGroup != null ? (
                    <Badge variant="secondary">Superserie {current.supersetGroup}</Badge>
                  ) : null}
                </div>

                {current.lastTimeSets.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    La última vez:{" "}
                    {current.lastTimeSets
                      .map((s) => `${s.weightKg ?? "–"}kg×${s.reps ?? "–"}`)
                      .join(", ")}
                  </p>
                ) : null}

                <div className="space-y-2">
                  {Array.from({
                    length: displayCountFor(current, extraSetsByKey[current.key] ?? 0),
                  }).map((_, rowIndex) => {
                    const prescribed = current.prescribedSets[rowIndex];
                    const logged = current.loggedSets[rowIndex];
                    const locked = !logged && rowIndex !== current.loggedSets.length;
                    return (
                      <SetRow
                        key={rowIndex}
                        displayNumber={rowIndex + 1}
                        setType={prescribed?.setType ?? logged?.setType ?? "working"}
                        prescribed={prescribed}
                        lastTime={current.lastTimeSets[rowIndex]}
                        logged={logged}
                        tracksWeight={current.exercise.tracksWeight}
                        tracksReps={current.exercise.tracksReps}
                        locked={locked}
                        onUndo={
                          logged && isOnline
                            ? () => handleUndoSet(current, logged)
                            : undefined
                        }
                        onComplete={(values) =>
                          handleLogSet(
                            current,
                            rowIndex,
                            prescribed?.setType ?? "working",
                            values,
                          )
                        }
                      />
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="touch"
                    onClick={() =>
                      setExtraSetsByKey((prev) => ({
                        ...prev,
                        [current.key]: (prev[current.key] ?? 0) + 1,
                      }))
                    }
                  >
                    + Serie
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="touch"
                    onClick={() => {
                      const nextRow =
                        current.prescribedSets[current.loggedSets.length]
                          ?.targetWeightKg ??
                        current.lastTimeSets[current.loggedSets.length]?.weightKg ??
                        null;
                      setPlateSheetTarget(nextRow);
                    }}
                  >
                    Calculadora de discos
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p>Todavía no agregaste ejercicios.</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Ejercicio anterior"
            >
              <ChevronLeft className="size-5" />
            </Button>
            {exercises.map((ex, i) => (
              <button
                key={ex.key}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir a ${ex.exercise.nameEs}`}
                className={`size-2.5 rounded-full transition-colors ${
                  i === currentIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex >= exercises.length - 1}
              aria-label="Siguiente ejercicio"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>

          {isFreeform ? (
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="w-full"
              onClick={() => setPickerOpen(true)}
            >
              + Agregar ejercicio
            </Button>
          ) : null}

          {!isOnline ? (
            <p className="text-center text-xs text-muted-foreground">
              Sin conexión — tus series ya están guardadas y se sincronizan solas.
              Conectate para terminar el entrenamiento.
            </p>
          ) : null}
        </main>
      )}

      <RestTimer
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />

      {current ? (
        <ExerciseDetailSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          exerciseName={current.exercise.nameEs}
          media={current.media}
          instructionsEs={current.exercise.instructionsEs}
        />
      ) : null}

      <PlateCalculatorSheet
        open={plateSheetTarget != null}
        onOpenChange={(open) => !open && setPlateSheetTarget(null)}
        targetWeightKg={plateSheetTarget}
        inventory={plateInventory}
      />

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handleConfirmFreeformExercises}
      />
    </div>
  );
}

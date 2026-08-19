"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/workout/stepper";
import { updateSessionMetaAction } from "@/server/actions/history";
import { updateSetLogAction, deleteSetLogAction } from "@/server/actions/workout";
import type { SessionDetail } from "@/server/db/history";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}min` : `${m} min`;
}

interface SetEditValues {
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
}

export function SessionDetailEditor({ session }: { session: SessionDetail }) {
  const router = useRouter();
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(
    session.bodyweightKg != null ? Number(session.bodyweightKg) : null,
  );
  const [mood, setMood] = useState<number | null>(session.mood);
  const [energy, setEnergy] = useState<number | null>(session.energy);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [sets, setSets] = useState(session.sets);
  const [isSaving, startSaving] = useTransition();

  const dayName = session.routineDay?.name ?? "Entrenamiento libre";
  const routineName = session.routineDay?.routine.name;

  function handleSaveMeta() {
    startSaving(async () => {
      await updateSessionMetaAction({
        sessionId: session.id,
        bodyweightKg,
        mood,
        energy,
        notes: notes || null,
      });
    });
  }

  async function handleUpdateSet(setLogId: string, values: SetEditValues) {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setLogId
          ? {
              ...s,
              ...(values.weightKg !== undefined
                ? { weightKg: values.weightKg != null ? String(values.weightKg) : null }
                : {}),
              ...(values.reps !== undefined ? { reps: values.reps } : {}),
              ...(values.rpe !== undefined
                ? { rpe: values.rpe != null ? String(values.rpe) : null }
                : {}),
            }
          : s,
      ),
    );
    await updateSetLogAction({ setLogId, ...values });
  }

  async function handleDeleteSet(setLogId: string) {
    setSets((prev) => prev.filter((s) => s.id !== setLogId));
    await deleteSetLogAction(setLogId);
    router.refresh();
  }

  const groups: { exerciseId: string; exerciseName: string; sets: typeof sets }[] = [];
  for (const s of sets) {
    let group = groups.find((g) => g.exerciseId === s.exerciseId);
    if (!group) {
      group = { exerciseId: s.exerciseId, exerciseName: s.exercise.nameEs, sets: [] };
      groups.push(group);
    }
    group.sets.push(s);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{dayName}</h1>
        {routineName ? (
          <p className="text-sm text-muted-foreground">{routineName}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {session.startedAt.toLocaleDateString("es-MX", { dateStyle: "full" })}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{formatDuration(session.durationSeconds)}</Badge>
          <Badge variant="outline">{session.totalSets ?? 0} series</Badge>
          {session.totalVolumeKg ? (
            <Badge variant="outline">
              {Math.round(Number(session.totalVolumeKg))}kg volumen
            </Badge>
          ) : null}
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Notas de la sesión
        </h2>
        <div className="flex items-center gap-3">
          <span className="w-28 text-sm text-muted-foreground">Peso corporal</span>
          <Stepper
            value={bodyweightKg}
            onChange={setBodyweightKg}
            step={0.5}
            suffix="kg"
            min={20}
            max={400}
            ariaLabel="peso corporal"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-28 text-sm text-muted-foreground">Ánimo (1-5)</span>
          <Stepper
            value={mood}
            onChange={setMood}
            step={1}
            min={1}
            max={5}
            ariaLabel="ánimo"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-28 text-sm text-muted-foreground">Energía (1-5)</span>
          <Stepper
            value={energy}
            onChange={setEnergy}
            step={1}
            min={1}
            max={5}
            ariaLabel="energía"
          />
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="¿Cómo te sentiste?"
        />
        <Button type="button" size="sm" onClick={handleSaveMeta} disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </section>

      <section className="space-y-4">
        {groups.map((group) => (
          <div key={group.exerciseId} className="space-y-2">
            <h3 className="font-semibold text-foreground">{group.exerciseName}</h3>
            <div className="space-y-1.5">
              {group.sets.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
                    s.failed ? "border-destructive/40" : "border-border"
                  }`}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <Stepper
                    value={s.weightKg != null ? Number(s.weightKg) : null}
                    onChange={(v) => handleUpdateSet(s.id, { weightKg: v })}
                    step={2.5}
                    suffix="kg"
                    min={0}
                    max={500}
                    ariaLabel="peso"
                  />
                  <Stepper
                    value={s.reps}
                    onChange={(v) => handleUpdateSet(s.id, { reps: v })}
                    step={1}
                    min={0}
                    max={100}
                    ariaLabel="repeticiones"
                  />
                  <Stepper
                    value={s.rpe != null ? Number(s.rpe) : null}
                    onChange={(v) => handleUpdateSet(s.id, { rpe: v })}
                    step={0.5}
                    min={1}
                    max={10}
                    ariaLabel="RPE"
                  />
                  {s.isPr ? <Badge variant="secondary">PR</Badge> : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    onClick={() => handleDeleteSet(s.id)}
                    aria-label="Eliminar serie"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

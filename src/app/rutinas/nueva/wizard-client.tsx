"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { springs } from "@/lib/motion/springs";
import { estimateSessionMinutes } from "@/lib/duration-estimate";
import { ROUTINE_TEMPLATES, type TemplateGoal } from "@/server/routines/templates";
import { createBlankRoutine, createRoutineFromTemplate } from "@/server/actions/routines";
import { splitTypeSchema } from "@/lib/validation/routines";

const GOALS: { value: TemplateGoal; label: string }[] = [
  { value: "hypertrophy", label: "Ganar músculo" },
  { value: "strength", label: "Fuerza" },
  { value: "endurance", label: "Resistencia" },
  { value: "recomp", label: "Recomposición" },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

type Step = "goal" | "days" | "template" | "blank-name";

export function WizardClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<TemplateGoal | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blankName, setBlankName] = useState("");

  const matchingTemplates = daysPerWeek
    ? ROUTINE_TEMPLATES.filter((t) => t.daysPerWeek === daysPerWeek)
    : [];
  const otherTemplates = daysPerWeek
    ? ROUTINE_TEMPLATES.filter((t) => t.daysPerWeek !== daysPerWeek)
    : ROUTINE_TEMPLATES;

  function chooseTemplate(templateId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createRoutineFromTemplate(templateId);
        router.push(`/rutinas/${id}`);
      } catch {
        setError("No se pudo crear la rutina. Intentá de nuevo.");
      }
    });
  }

  function createBlank() {
    if (!goal || !daysPerWeek || !blankName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createBlankRoutine({
          name: blankName.trim(),
          goal,
          splitType: splitTypeSchema.parse("custom"),
          daysPerWeek,
        });
        router.push(`/rutinas/${id}`);
      } catch {
        setError("No se pudo crear la rutina. Intentá de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === "goal" && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={springs.smooth}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground">1. ¿Cuál es tu objetivo?</p>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <Button
                  key={g.value}
                  type="button"
                  variant="outline"
                  size="touch"
                  className="h-20 flex-col"
                  onClick={() => {
                    setGoal(g.value);
                    setStep("days");
                  }}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "days" && (
          <motion.div
            key="days"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={springs.smooth}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground">2. ¿Cuántos días por semana?</p>
            <div className="flex flex-wrap gap-3">
              {DAYS_OPTIONS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="outline"
                  size="icon-touch"
                  onClick={() => {
                    setDaysPerWeek(d);
                    setStep("template");
                  }}
                >
                  {d}
                </Button>
              ))}
            </div>
            <Button type="button" variant="ghost" onClick={() => setStep("goal")}>
              Atrás
            </Button>
          </motion.div>
        )}

        {step === "template" && (
          <motion.div
            key="template"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={springs.smooth}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              3. Elegí una plantilla o empezá en blanco
            </p>

            {matchingTemplates.length > 0 && (
              <div className="space-y-2">
                {matchingTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onChoose={() => chooseTemplate(t.id)}
                  />
                ))}
              </div>
            )}

            {otherTemplates.length > 0 && (
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Ver otras plantillas ({otherTemplates.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {otherTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onChoose={() => chooseTemplate(t.id)}
                    />
                  ))}
                </div>
              </details>
            )}

            <Button
              type="button"
              variant="outline"
              size="touch"
              className="w-full"
              onClick={() => setStep("blank-name")}
            >
              Empezar en blanco
            </Button>

            <Button type="button" variant="ghost" onClick={() => setStep("days")}>
              Atrás
            </Button>
          </motion.div>
        )}

        {step === "blank-name" && (
          <motion.div
            key="blank-name"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={springs.smooth}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">4. Nombre de la rutina</p>
            <div className="space-y-2">
              <Label htmlFor="blank-name">Nombre</Label>
              <Input
                id="blank-name"
                value={blankName}
                onChange={(e) => setBlankName(e.target.value)}
                placeholder="Mi rutina"
                className="h-12 text-base"
                autoFocus
              />
            </div>
            <Button
              type="button"
              size="touch"
              className="w-full"
              disabled={!blankName.trim() || isPending}
              onClick={createBlank}
            >
              {isPending ? "Creando…" : "Crear rutina vacía"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("template")}>
              Atrás
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  onChoose,
}: {
  template: (typeof ROUTINE_TEMPLATES)[number];
  onChoose: () => void;
}) {
  const firstDayMinutes = estimateSessionMinutes(
    template.days[0]!.exercises.map((e) => ({
      tempo: e.tempo,
      restSeconds: e.restSeconds,
      sets: e.sets,
    })),
  );

  return (
    <button
      type="button"
      onClick={onChoose}
      className="block w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
    >
      <p className="font-semibold text-foreground">{template.name}</p>
      <p className="text-sm text-muted-foreground">{template.description}</p>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
        {template.days.length} días · ~{firstDayMinutes} min/sesión
      </p>
    </button>
  );
}

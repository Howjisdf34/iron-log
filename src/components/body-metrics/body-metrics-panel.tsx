"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeightChart } from "./weight-chart";
import { deleteBodyMetricAction, upsertBodyMetricAction } from "@/server/actions/history";
import { movingAverage } from "@/lib/moving-average";
import type { BodyMetric } from "@/db/schema";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export function BodyMetricsPanel({ metrics: initialMetrics }: { metrics: BodyMetric[] }) {
  const router = useRouter();
  const [metrics, setMetrics] = useState(initialMetrics);
  const [date, setDate] = useState(todayKey());
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [isSaving, startSaving] = useTransition();

  const chartData = movingAverage(
    metrics
      .filter((m) => m.weightKg != null)
      .map((m) => ({ date: m.date, value: Number(m.weightKg) })),
    7,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const saved = await upsertBodyMetricAction({
        date,
        weightKg: toNumberOrNull(weightKg),
        bodyFatPct: toNumberOrNull(bodyFatPct),
        chest: toNumberOrNull(chest),
        waist: toNumberOrNull(waist),
        arm: toNumberOrNull(arm),
        thigh: toNumberOrNull(thigh),
      });
      setMetrics((prev) => {
        const withoutSameDate = prev.filter((m) => m.date !== saved.date);
        return [saved, ...withoutSameDate].sort((a, b) => b.date.localeCompare(a.date));
      });
      setWeightKg("");
      setBodyFatPct("");
      setChest("");
      setWaist("");
      setArm("");
      setThigh("");
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    await deleteBodyMetricAction(id);
  }

  return (
    <div className="space-y-6">
      {chartData.length > 1 ? <WeightChart data={chartData} /> : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-border p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="metric-date">Fecha</Label>
            <Input
              id="metric-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
              max={todayKey()}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="metric-weight">Peso (kg)</Label>
            <Input
              id="metric-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "Ocultar medidas" : "+ más medidas"}
        </button>

        {showMore ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="metric-bf">% grasa</Label>
              <Input
                id="metric-bf"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="metric-chest">Pecho (cm)</Label>
              <Input
                id="metric-chest"
                type="number"
                inputMode="decimal"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="metric-waist">Cintura (cm)</Label>
              <Input
                id="metric-waist"
                type="number"
                inputMode="decimal"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="metric-arm">Brazo (cm)</Label>
              <Input
                id="metric-arm"
                type="number"
                inputMode="decimal"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="metric-thigh">Muslo (cm)</Label>
              <Input
                id="metric-thigh"
                type="number"
                inputMode="decimal"
                value={thigh}
                onChange={(e) => setThigh(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        ) : null}

        <Button type="submit" size="touch" className="w-full" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </form>

      <ul className="space-y-1">
        {metrics.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
          >
            <span className="tabular-nums text-foreground">{m.date}</span>
            <span className="flex items-center gap-3 tabular-nums text-muted-foreground">
              {m.weightKg ? `${Number(m.weightKg)}kg` : "—"}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(m.id)}
                aria-label="Eliminar registro"
              >
                <Trash2 className="size-4" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

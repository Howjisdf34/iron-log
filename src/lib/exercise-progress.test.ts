import { describe, expect, it } from "vitest";
import {
  estimatedOneRepMaxOverTime,
  maxWeightOverTime,
  weeklyVolume,
  type ExerciseSetPoint,
} from "./exercise-progress";

describe("estimatedOneRepMaxOverTime", () => {
  it("toma la mejor serie de cada sesión", () => {
    const points: ExerciseSetPoint[] = [
      { date: "2026-01-01", weightKg: 80, reps: 5 },
      { date: "2026-01-01", weightKg: 100, reps: 3 }, // mejor 1RM que 80x5
      { date: "2026-01-08", weightKg: 85, reps: 5 },
    ];
    const result = estimatedOneRepMaxOverTime(points);
    expect(result).toHaveLength(2);
    expect(result[0]!.date).toBe("2026-01-01");
    // 100 * (1 + 3/30) = 110
    expect(result[0]!.epley).toBeCloseTo(110, 0);
  });

  it("ignora series sin peso o reps", () => {
    const points: ExerciseSetPoint[] = [{ date: "2026-01-01", weightKg: null, reps: 5 }];
    expect(estimatedOneRepMaxOverTime(points)).toEqual([]);
  });
});

describe("maxWeightOverTime", () => {
  it("se queda con el peso máximo por día", () => {
    const points: ExerciseSetPoint[] = [
      { date: "2026-01-01", weightKg: 80, reps: 5 },
      { date: "2026-01-01", weightKg: 90, reps: 3 },
    ];
    expect(maxWeightOverTime(points)).toEqual([{ date: "2026-01-01", weightKg: 90 }]);
  });
});

describe("weeklyVolume", () => {
  it("suma volumen y reps dentro de la misma semana ISO", () => {
    const points: ExerciseSetPoint[] = [
      { date: "2026-01-12", weightKg: 80, reps: 5 }, // lunes
      { date: "2026-01-14", weightKg: 80, reps: 5 }, // miércoles, misma semana
      { date: "2026-01-19", weightKg: 80, reps: 5 }, // lunes siguiente
    ];
    const result = weeklyVolume(points);
    expect(result).toHaveLength(2);
    expect(result[0]!.volumeKg).toBe(800);
    expect(result[0]!.totalReps).toBe(10);
  });
});

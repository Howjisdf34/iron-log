import { describe, expect, it } from "vitest";
import { weeklyMuscleVolume, type MuscleSetPoint } from "./muscle-volume";

describe("weeklyMuscleVolume", () => {
  it("cuenta 1 serie efectiva por músculo primario", () => {
    const points: MuscleSetPoint[] = [
      { date: "2026-01-12", primaryMuscleIds: ["chest"], secondaryMuscleIds: [] },
      { date: "2026-01-13", primaryMuscleIds: ["chest"], secondaryMuscleIds: [] },
    ];
    const result = weeklyMuscleVolume(points);
    expect(result).toEqual([{ week: "2026-01-12", muscleId: "chest", effectiveSets: 2 }]);
  });

  it("cuenta 0.5 por músculo secundario", () => {
    const points: MuscleSetPoint[] = [
      {
        date: "2026-01-12",
        primaryMuscleIds: ["chest"],
        secondaryMuscleIds: ["triceps"],
      },
    ];
    const result = weeklyMuscleVolume(points);
    expect(result).toEqual(
      expect.arrayContaining([
        { week: "2026-01-12", muscleId: "chest", effectiveSets: 1 },
        { week: "2026-01-12", muscleId: "triceps", effectiveSets: 0.5 },
      ]),
    );
  });

  it("separa por semana ISO distinta", () => {
    const points: MuscleSetPoint[] = [
      { date: "2026-01-12", primaryMuscleIds: ["chest"], secondaryMuscleIds: [] },
      { date: "2026-01-19", primaryMuscleIds: ["chest"], secondaryMuscleIds: [] },
    ];
    expect(weeklyMuscleVolume(points)).toHaveLength(2);
  });
});

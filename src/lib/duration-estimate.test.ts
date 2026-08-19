import { describe, expect, it } from "vitest";
import { estimateSessionMinutes } from "./duration-estimate";

describe("estimateSessionMinutes", () => {
  it("calcula tiempo con tempo y descanso explícitos", () => {
    // 1 serie de 10 reps, tempo 2-0-2-0 (4s/rep) = 40s + 60s descanso = 100s
    const minutes = estimateSessionMinutes([
      { tempo: "2-0-2-0", restSeconds: 60, sets: [{ targetReps: 10 }] },
    ]);
    expect(minutes).toBe(2); // round(100/60)
  });

  it("usa defaults razonables sin tempo/descanso/reps", () => {
    const minutes = estimateSessionMinutes([{ sets: [{}] }]);
    // 10 reps * 4s + 90s descanso = 130s -> round(130/60) = 2
    expect(minutes).toBe(2);
  });

  it("promedia targetRepsMin/Max cuando no hay targetReps fijo", () => {
    const withRange = estimateSessionMinutes([
      {
        restSeconds: 0,
        tempo: "1-0-1-0",
        sets: [{ targetRepsMin: 8, targetRepsMax: 12 }],
      },
    ]);
    // promedio 10 reps * 2s/rep = 20s + 0 descanso = 20s -> round(20/60) = 0
    expect(withRange).toBe(0);
  });

  it("suma múltiples ejercicios y series", () => {
    const minutes = estimateSessionMinutes([
      {
        tempo: "2-0-2-0",
        restSeconds: 120,
        sets: [{ targetReps: 8 }, { targetReps: 8 }, { targetReps: 8 }],
      },
      {
        tempo: "2-0-2-0",
        restSeconds: 90,
        sets: [{ targetReps: 10 }, { targetReps: 10 }],
      },
    ]);
    // ej1: 3 * (32 + 120) = 456s | ej2: 2 * (40 + 90) = 260s | total 716s -> 12min
    expect(minutes).toBe(12);
  });

  it("tempo inválido cae al default en vez de NaN", () => {
    const minutes = estimateSessionMinutes([
      { tempo: "no-valido", restSeconds: 60, sets: [{ targetReps: 10 }] },
    ]);
    expect(Number.isNaN(minutes)).toBe(false);
    expect(minutes).toBe(2);
  });
});

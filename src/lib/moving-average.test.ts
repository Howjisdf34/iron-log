import { describe, expect, it } from "vitest";
import { movingAverage } from "./moving-average";

describe("movingAverage", () => {
  it("con menos puntos que la ventana, promedia lo que hay", () => {
    const points = [
      { date: "2026-01-01", value: 80 },
      { date: "2026-01-02", value: 82 },
    ];
    const result = movingAverage(points, 7);
    expect(result[0]!.avg).toBe(80);
    expect(result[1]!.avg).toBe(81);
  });

  it("promedia sólo la ventana de los últimos N puntos", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      value: 100,
    }));
    points[9] = { date: "2026-01-10", value: 200 }; // último día muy distinto
    const result = movingAverage(points, 7);
    // ventana de 7 sobre el último punto: 6*100 + 200 = 800 / 7
    expect(result.at(-1)!.avg).toBeCloseTo(800 / 7, 5);
  });

  it("ordena los puntos por fecha antes de calcular", () => {
    const points = [
      { date: "2026-01-02", value: 10 },
      { date: "2026-01-01", value: 20 },
    ];
    const result = movingAverage(points, 7);
    expect(result[0]!.date).toBe("2026-01-01");
    expect(result[1]!.date).toBe("2026-01-02");
  });
});

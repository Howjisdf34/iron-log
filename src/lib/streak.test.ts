import { describe, expect, it } from "vitest";
import { calculateStreak } from "./streak";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe("calculateStreak", () => {
  it("sin entrenamientos, racha 0", () => {
    expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it("3 días seguidos hasta hoy: racha actual y más larga = 3", () => {
    const today = d("2026-01-15");
    const dates = [d("2026-01-13"), d("2026-01-14"), d("2026-01-15")];
    expect(calculateStreak(dates, today)).toEqual({ current: 3, longest: 3 });
  });

  it("no rompe la racha si hoy todavía no se entrenó pero ayer sí", () => {
    const today = d("2026-01-16");
    const dates = [d("2026-01-13"), d("2026-01-14"), d("2026-01-15")];
    expect(calculateStreak(dates, today)).toEqual({ current: 3, longest: 3 });
  });

  it("se rompe si pasaron 2+ días sin entrenar", () => {
    const today = d("2026-01-17");
    const dates = [d("2026-01-13"), d("2026-01-14"), d("2026-01-15")];
    expect(calculateStreak(dates, today).current).toBe(0);
  });

  it("la racha más larga puede ser distinta a la actual", () => {
    const today = d("2026-01-20");
    const dates = [
      d("2026-01-01"),
      d("2026-01-02"),
      d("2026-01-03"),
      d("2026-01-04"), // racha de 4, terminada
      d("2026-01-19"),
      d("2026-01-20"), // racha actual de 2
    ];
    expect(calculateStreak(dates, today)).toEqual({ current: 2, longest: 4 });
  });

  it("dos sesiones el mismo día cuentan como un solo día", () => {
    const today = d("2026-01-15");
    const dates = [new Date("2026-01-15T08:00:00Z"), new Date("2026-01-15T19:00:00Z")];
    expect(calculateStreak(dates, today)).toEqual({ current: 1, longest: 1 });
  });
});

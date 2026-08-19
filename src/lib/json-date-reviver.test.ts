import { describe, expect, it } from "vitest";
import { reviveDates } from "./json-date-reviver";

describe("reviveDates", () => {
  it("convierte timestamps ISO anidados en cualquier profundidad", () => {
    const input = {
      startedAt: "2026-01-15T10:00:00.000Z",
      sets: [{ completedAt: "2026-01-15T10:05:00.000Z", weightKg: "80" }],
    };
    const result = reviveDates(input) as {
      startedAt: Date;
      sets: { completedAt: Date; weightKg: string }[];
    };
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.sets[0]!.completedAt).toBeInstanceOf(Date);
  });

  it("no toca fechas simples tipo YYYY-MM-DD (columnas `date`, no `timestamp`)", () => {
    const result = reviveDates({ date: "2026-01-15" }) as { date: unknown };
    expect(result.date).toBe("2026-01-15");
  });

  it("no toca strings que no son fechas", () => {
    const result = reviveDates({ name: "Push A", weightKg: "80.50" }) as {
      name: unknown;
      weightKg: unknown;
    };
    expect(result.name).toBe("Push A");
    expect(result.weightKg).toBe("80.50");
  });

  it("deja null/undefined/números intactos", () => {
    expect(reviveDates(null)).toBeNull();
    expect(reviveDates(42)).toBe(42);
  });
});

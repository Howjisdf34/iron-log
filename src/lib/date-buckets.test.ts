import { describe, expect, it } from "vitest";
import { dateKey, isoWeekKey, startOfIsoWeek } from "./date-buckets";

describe("startOfIsoWeek", () => {
  it("un miércoles retrocede al lunes de esa semana", () => {
    const wednesday = new Date("2026-01-14T15:00:00Z"); // miércoles
    expect(startOfIsoWeek(wednesday).toISOString().slice(0, 10)).toBe("2026-01-12");
  });

  it("un lunes se queda igual", () => {
    const monday = new Date("2026-01-12T08:00:00Z");
    expect(startOfIsoWeek(monday).toISOString().slice(0, 10)).toBe("2026-01-12");
  });

  it("un domingo retrocede al lunes anterior", () => {
    const sunday = new Date("2026-01-18T08:00:00Z");
    expect(startOfIsoWeek(sunday).toISOString().slice(0, 10)).toBe("2026-01-12");
  });
});

describe("isoWeekKey", () => {
  it("agrupa dos fechas de la misma semana bajo la misma key", () => {
    expect(isoWeekKey(new Date("2026-01-12T08:00:00Z"))).toBe(
      isoWeekKey(new Date("2026-01-18T20:00:00Z")),
    );
  });
});

describe("dateKey", () => {
  it("da el día en formato ISO corto", () => {
    expect(dateKey(new Date("2026-01-14T23:59:00Z"))).toBe("2026-01-14");
  });
});

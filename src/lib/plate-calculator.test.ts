import { describe, expect, it } from "vitest";
import { calculatePlateBreakdown } from "./plate-calculator";

const standardInventory = {
  barWeightKg: 20,
  platesAvailable: { "20": 4, "10": 2, "5": 2, "2.5": 2, "1.25": 2 },
};

describe("calculatePlateBreakdown", () => {
  it("reparte 60kg como 20 por lado", () => {
    const result = calculatePlateBreakdown(60, standardInventory);
    expect(result.exact).toBe(true);
    expect(result.perSide).toEqual([{ plateKg: 20, count: 1 }]);
    expect(result.totalWeightKg).toBe(60);
  });

  it("combina denominaciones para 87.5kg", () => {
    const result = calculatePlateBreakdown(87.5, standardInventory);
    expect(result.exact).toBe(true);
    expect(result.totalWeightKg).toBeCloseTo(87.5);
  });

  it("peso objetivo == barra no pone discos", () => {
    const result = calculatePlateBreakdown(20, standardInventory);
    expect(result.perSide).toEqual([]);
    expect(result.exact).toBe(true);
  });

  it("objetivo por debajo del peso de la barra no pone discos negativos", () => {
    const result = calculatePlateBreakdown(15, standardInventory);
    expect(result.perSide).toEqual([]);
    expect(result.totalWeightKg).toBe(20);
    expect(result.exact).toBe(false);
  });

  it("marca exact:false si el inventario no alcanza el objetivo", () => {
    const poor = { barWeightKg: 20, platesAvailable: { "5": 1 } };
    const result = calculatePlateBreakdown(100, poor);
    expect(result.exact).toBe(false);
    expect(result.totalWeightKg).toBe(30);
  });
});

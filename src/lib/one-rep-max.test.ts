import { describe, expect, it } from "vitest";
import { estimateOneRepMax, estimateOneRepMaxBrzycki } from "./one-rep-max";

describe("estimateOneRepMax (Epley)", () => {
  it("con 1 rep, el 1RM es el peso mismo", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("calcula 100kg x 5 reps", () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1);
  });

  it("devuelve 0 con inputs inválidos", () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe("estimateOneRepMaxBrzycki", () => {
  it("con 1 rep, el 1RM es el peso mismo", () => {
    expect(estimateOneRepMaxBrzycki(100, 1)).toBe(100);
  });

  it("calcula 100kg x 5 reps", () => {
    expect(estimateOneRepMaxBrzycki(100, 5)).toBeCloseTo(112.5, 1);
  });

  it("no diverge cerca de 37 reps", () => {
    expect(estimateOneRepMaxBrzycki(50, 40)).toBe(50);
  });
});

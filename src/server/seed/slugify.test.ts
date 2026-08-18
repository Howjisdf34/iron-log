import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slugify";

describe("slugify", () => {
  it("normaliza espacios, mayúsculas y acentos", () => {
    expect(slugify("Barbell Bench Press")).toBe("barbell-bench-press");
    expect(slugify("Sentadilla Búlgara")).toBe("sentadilla-bulgara");
  });

  it("colapsa símbolos y guiones redundantes", () => {
    expect(slugify("1/2 Kneeling Thoracic Rotation")).toBe(
      "1-2-kneeling-thoracic-rotation",
    );
    expect(slugify("  --Wide Push-Up--  ")).toBe("wide-push-up");
  });
});

describe("uniqueSlug", () => {
  it("devuelve el slug base si no está tomado", () => {
    expect(uniqueSlug("squat", new Set(), "abc12345")).toBe("squat");
  });

  it("desambigua con el sufijo si ya está tomado", () => {
    const taken = new Set(["squat"]);
    expect(uniqueSlug("squat", taken, "abcdef12-uuid")).toBe("squat-abcdef12");
  });
});

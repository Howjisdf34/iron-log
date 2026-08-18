import { describe, expect, it } from "vitest";
import { springs } from "./springs";

describe("springs", () => {
  it("expone exactamente snappy, smooth y bouncy", () => {
    expect(Object.keys(springs).sort()).toEqual(["bouncy", "smooth", "snappy"]);
  });

  it("cada spring define stiffness y damping positivos", () => {
    for (const [name, spring] of Object.entries(springs)) {
      expect(spring.type, name).toBe("spring");
      expect(spring.stiffness, name).toBeGreaterThan(0);
      expect(spring.damping, name).toBeGreaterThan(0);
    }
  });
});

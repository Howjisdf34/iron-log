import { describe, expect, it } from "vitest";
import { normalizeExercise } from "./normalize";
import type { WgerExerciseInfo } from "./wger-types";
import type { FreeExerciseDbEntry } from "./free-exercise-db-types";

function wgerFixture(overrides: Partial<WgerExerciseInfo> = {}): WgerExerciseInfo {
  return {
    id: 1,
    uuid: "00000000-0000-0000-0000-000000000001",
    category: { id: 11, name: "Chest" },
    muscles: [],
    muscles_secondary: [],
    equipment: [],
    license: { id: 2, short_name: "CC-BY-SA 4" },
    license_author: "Anon",
    images: [],
    translations: [
      {
        id: 1,
        name: "Bench Press",
        description: "<p>Empuja.</p>",
        language: 2,
        aliases: [],
      },
    ],
    videos: [],
    ...overrides,
  };
}

function feFixture(overrides: Partial<FreeExerciseDbEntry> = {}): FreeExerciseDbEntry {
  return {
    id: "bench-press",
    name: "Bench Press",
    force: "push",
    level: "intermediate",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    instructions: ["step"],
    category: "strength",
    images: ["Bench_Press/0.jpg", "Bench_Press/1.jpg"],
    ...overrides,
  };
}

describe("normalizeExercise", () => {
  it("marca needsTranslation cuando no hay traducción al español", () => {
    const result = normalizeExercise(wgerFixture(), new Map(), new Set());
    expect(result.needsTranslation).toBe(true);
    expect(result.nameEs).toBe("Bench Press"); // cae al inglés
  });

  it("usa la traducción en español cuando existe", () => {
    const wger = wgerFixture({
      translations: [
        {
          id: 1,
          name: "Bench Press",
          description: "<p>Push.</p>",
          language: 2,
          aliases: [],
        },
        {
          id: 2,
          name: "Press de banca",
          description: "<p>Empuja la barra.</p>",
          language: 4,
          aliases: [],
        },
      ],
    });
    const result = normalizeExercise(wger, new Map(), new Set());
    expect(result.needsTranslation).toBe(false);
    expect(result.nameEs).toBe("Press de banca");
  });

  it("category = cardio cuando la categoría de wger es Cardio", () => {
    const wger = wgerFixture({ category: { id: 15, name: "Cardio" } });
    const result = normalizeExercise(wger, new Map(), new Set());
    expect(result.category).toBe("cardio");
  });

  it("category = isolation cuando matchea free-exercise-db con mechanic isolation", () => {
    const feDb = feFixture({ mechanic: "isolation" });
    const index = new Map([["bench press", feDb]]);
    const result = normalizeExercise(wgerFixture(), index, new Set());
    expect(result.category).toBe("isolation");
    expect(result.force).toBe("push");
    expect(result.level).toBe("intermediate");
  });

  it("category por defecto es compound sin match ni pista de cardio", () => {
    const result = normalizeExercise(wgerFixture(), new Map(), new Set());
    expect(result.category).toBe("compound");
    expect(result.force).toBeNull();
  });

  it("usa las 2 imágenes del match de free-exercise-db como fallback", () => {
    const feDb = feFixture();
    const index = new Map([["bench press", feDb]]);
    const result = normalizeExercise(wgerFixture(), index, new Set());
    expect(result.freeExerciseImageUrls).toEqual([
      "Bench_Press/0.jpg",
      "Bench_Press/1.jpg",
    ]);
  });

  it("desambigua el slug si ya está tomado", () => {
    const taken = new Set(["bench-press"]);
    const result = normalizeExercise(wgerFixture(), new Map(), taken);
    expect(result.slug).toBe("bench-press-00000000");
  });
});

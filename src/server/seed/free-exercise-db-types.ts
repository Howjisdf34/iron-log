/** Shape real de yuhonas/free-exercise-db (dist/exercises.json), verificado con curl. */
export interface FreeExerciseDbEntry {
  id: string;
  name: string;
  force: "push" | "pull" | "static" | null;
  level: "beginner" | "intermediate" | "expert";
  mechanic: "compound" | "isolation" | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  /** rutas relativas, ej. "3_4_Sit-Up/0.jpg" — se resuelven contra FREE_EXERCISE_DB_IMAGE_BASE. */
  images: string[];
}

export const FREE_EXERCISE_DB_JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

export const FREE_EXERCISE_DB_IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

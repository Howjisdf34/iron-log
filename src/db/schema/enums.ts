import { pgEnum } from "drizzle-orm/pg-core";

export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "compound",
  "isolation",
  "cardio",
  "mobility",
]);

export const exerciseForceEnum = pgEnum("exercise_force", ["push", "pull", "static"]);

export const exerciseMechanicEnum = pgEnum("exercise_mechanic", [
  "compound",
  "isolation",
]);

export const exerciseLevelEnum = pgEnum("exercise_level", [
  "beginner",
  "intermediate",
  "expert",
]);

export const mediaTypeEnum = pgEnum("media_type", ["video", "image_sequence", "gif"]);

export const routineGoalEnum = pgEnum("routine_goal", [
  "strength",
  "hypertrophy",
  "endurance",
  "recomp",
]);

export const splitTypeEnum = pgEnum("split_type", [
  "ppl",
  "upper_lower",
  "full_body",
  "arnold",
  "bro_split",
  "custom",
]);

export const setTypeEnum = pgEnum("set_type", [
  "warmup",
  "working",
  "drop",
  "failure",
  "amrap",
  "backoff",
]);

export const progressionTypeEnum = pgEnum("progression_type", [
  "double_progression",
  "linear",
  "rpe_autoregulated",
  "percentage_1rm",
  "manual",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
  "abandoned",
]);

export const prTypeEnum = pgEnum("pr_type", [
  "1rm_estimated",
  "weight",
  "reps_at_weight",
  "volume",
  "time",
]);

export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);

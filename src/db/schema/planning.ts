import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { newId } from "@/lib/id";
import { users } from "./users";
import { exercises } from "./catalog";
import {
  progressionTypeEnum,
  routineGoalEnum,
  setTypeEnum,
  splitTypeEnum,
} from "./enums";

/** Progresión reutilizable entre slots — ver CLAUDE.md §3. */
export const progressionRules = pgTable("progression_rules", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  type: progressionTypeEnum("type").notNull(),
  /** p. ej. double_progression: { incrementKg: 2.5 } */
  params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    goal: routineGoalEnum("goal").notNull(),
    splitType: splitTypeEnum("split_type").notNull(),
    daysPerWeek: integer("days_per_week").notNull(),
    weeksTotal: integer("weeks_total"),
    deloadEveryNWeeks: integer("deload_every_n_weeks"),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routines_user_idx").on(t.userId)],
);

export const routineDays = pgTable(
  "routine_days",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    name: text("name").notNull(),
    /** 0=lunes..6=domingo, null = rutina cíclica sin día fijo. */
    weekdayHint: integer("weekday_hint"),
    estimatedMinutes: integer("estimated_minutes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routine_days_routine_idx").on(t.routineId)],
);

export const routineExercises = pgTable(
  "routine_exercises",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    dayId: uuid("day_id")
      .notNull()
      .references(() => routineDays.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    /** mismo valor entre filas = superserie. */
    supersetGroup: integer("superset_group"),
    restSeconds: integer("rest_seconds"),
    /** p. ej. "3-1-1-0" (excéntrico-pausa-concéntrico-pausa). */
    tempo: text("tempo"),
    notes: text("notes"),
    progressionRuleId: uuid("progression_rule_id").references(() => progressionRules.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routine_exercises_day_idx").on(t.dayId)],
);

export const routineSets = pgTable(
  "routine_sets",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    routineExerciseId: uuid("routine_exercise_id")
      .notNull()
      .references(() => routineExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    setType: setTypeEnum("set_type").notNull().default("working"),
    targetReps: integer("target_reps"),
    targetRepsMin: integer("target_reps_min"),
    targetRepsMax: integer("target_reps_max"),
    targetWeightKg: numeric("target_weight_kg", { precision: 6, scale: 2 }),
    targetRpe: numeric("target_rpe", { precision: 3, scale: 1 }),
    targetPercent1rm: numeric("target_percent_1rm", { precision: 5, scale: 2 }),
    restSecondsOverride: integer("rest_seconds_override"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routine_sets_routine_exercise_idx").on(t.routineExerciseId)],
);

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, { fields: [routines.userId], references: [users.id] }),
  days: many(routineDays),
}));

export const routineDaysRelations = relations(routineDays, ({ one, many }) => ({
  routine: one(routines, { fields: [routineDays.routineId], references: [routines.id] }),
  exercises: many(routineExercises),
}));

export const routineExercisesRelations = relations(routineExercises, ({ one, many }) => ({
  day: one(routineDays, {
    fields: [routineExercises.dayId],
    references: [routineDays.id],
  }),
  exercise: one(exercises, {
    fields: [routineExercises.exerciseId],
    references: [exercises.id],
  }),
  progressionRule: one(progressionRules, {
    fields: [routineExercises.progressionRuleId],
    references: [progressionRules.id],
  }),
  sets: many(routineSets),
}));

export const routineSetsRelations = relations(routineSets, ({ one }) => ({
  routineExercise: one(routineExercises, {
    fields: [routineSets.routineExerciseId],
    references: [routineExercises.id],
  }),
}));

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
export type RoutineDay = typeof routineDays.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type RoutineSet = typeof routineSets.$inferSelect;

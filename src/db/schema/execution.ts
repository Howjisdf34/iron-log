import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { newId } from "@/lib/id";
import { users } from "./users";
import { exercises } from "./catalog";
import { routineDays, routineSets } from "./planning";
import { prTypeEnum, sessionStatusEnum, setTypeEnum, weightUnitEnum } from "./enums";

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** null = entrenamiento libre, sin rutina. */
    routineDayId: uuid("routine_day_id").references(() => routineDays.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    bodyweightKg: numeric("bodyweight_kg", { precision: 5, scale: 2 }),
    mood: smallint("mood"),
    energy: smallint("energy"),
    notes: text("notes"),
    totalVolumeKg: numeric("total_volume_kg", { precision: 10, scale: 2 }),
    totalSets: integer("total_sets"),
    status: sessionStatusEnum("status").notNull().default("in_progress"),
    /** uuid v7 generado en cliente — idempotencia del sync offline (Fase 5). */
    clientId: uuid("client_id").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workout_sessions_user_started_idx").on(t.userId, t.startedAt.desc()),
    unique("workout_sessions_client_id_unique").on(t.clientId),
  ],
);

export const setLogs = pgTable(
  "set_logs",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    routineSetId: uuid("routine_set_id").references(() => routineSets.id, {
      onDelete: "set null",
    }),
    order: integer("order").notNull(),
    setType: setTypeEnum("set_type").notNull().default("working"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    reps: integer("reps"),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    rir: numeric("rir", { precision: 3, scale: 1 }),
    timeSeconds: integer("time_seconds"),
    distanceM: numeric("distance_m", { precision: 8, scale: 2 }),
    /** descanso medido real, no el prescrito. */
    restTakenSeconds: integer("rest_taken_seconds"),
    isPr: boolean("is_pr").notNull().default(false),
    failed: boolean("failed").notNull().default(false),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    clientId: uuid("client_id").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("set_logs_session_order_idx").on(t.sessionId, t.order),
    unique("set_logs_client_id_unique").on(t.clientId),
  ],
);

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    type: prTypeEnum("type").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    setLogId: uuid("set_log_id").references(() => setLogs.id, { onDelete: "set null" }),
    achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("personal_records_user_exercise_idx").on(
      t.userId,
      t.exerciseId,
      t.achievedAt.desc(),
    ),
  ],
);

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
    chest: numeric("chest", { precision: 5, scale: 1 }),
    waist: numeric("waist", { precision: 5, scale: 1 }),
    arm: numeric("arm", { precision: 5, scale: 1 }),
    thigh: numeric("thigh", { precision: 5, scale: 1 }),
    photoPath: text("photo_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("body_metrics_user_date_idx").on(t.userId, t.date.desc())],
);

export const plateInventory = pgTable(
  "plate_inventory",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    barWeightKg: numeric("bar_weight_kg", { precision: 5, scale: 2 })
      .notNull()
      .default("20"),
    /** { "20": 4, "10": 2, "5": 2, "2.5": 2, "1.25": 2 } — kg de cada disco por lado. */
    platesAvailable: jsonb("plates_available").$type<Record<string, number>>().notNull(),
    unit: weightUnitEnum("unit").notNull().default("kg"),
    hasMicroplates: boolean("has_microplates").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("plate_inventory_user_unique").on(t.userId)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().$defaultFn(newId),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    unit: weightUnitEnum("unit").notNull().default("kg"),
    defaultIncrementKg: numeric("default_increment_kg", { precision: 4, scale: 2 })
      .notNull()
      .default("2.5"),
    soundsEnabled: boolean("sounds_enabled").notNull().default(true),
    hapticsEnabled: boolean("haptics_enabled").notNull().default(true),
    theme: text("theme").notNull().default("dark"),
    /** "list" | "focus" — modo del Workout Player, ver player-header.tsx. */
    workoutMode: text("workout_mode").notNull().default("list"),
    language: text("language").notNull().default("es"),
    restAutoStart: boolean("rest_auto_start").notNull().default(true),
    keepScreenAwake: boolean("keep_screen_awake").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("user_settings_user_unique").on(t.userId)],
);

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(users, { fields: [workoutSessions.userId], references: [users.id] }),
  routineDay: one(routineDays, {
    fields: [workoutSessions.routineDayId],
    references: [routineDays.id],
  }),
  sets: many(setLogs),
}));

export const setLogsRelations = relations(setLogs, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [setLogs.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, { fields: [setLogs.exerciseId], references: [exercises.id] }),
}));

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type SetLog = typeof setLogs.$inferSelect;
export type NewSetLog = typeof setLogs.$inferInsert;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type PlateInventory = typeof plateInventory.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;

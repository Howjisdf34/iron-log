import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { newId } from "@/lib/id";
import {
  exerciseCategoryEnum,
  exerciseForceEnum,
  exerciseLevelEnum,
  exerciseMechanicEnum,
  mediaTypeEnum,
} from "./enums";

/** Catálogo compartido, read-only para el usuario — poblado por `pnpm seed:exercises` (Fase 2). */

export const equipment = pgTable("equipment", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  slug: text("slug").notNull().unique(),
  nameEs: text("name_es").notNull(),
  nameEn: text("name_en").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const muscles = pgTable("muscles", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  slug: text("slug").notNull().unique(),
  nameEs: text("name_es").notNull(),
  nameEn: text("name_en").notNull(),
  isFront: boolean("is_front").notNull(),
  /** Coordenadas del mapa muscular SVG tappable (Fase 3). Shape libre por ahora. */
  svgCoordinates: jsonb("svg_coordinates").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  slug: text("slug").notNull().unique(),
  nameEs: text("name_es").notNull(),
  nameEn: text("name_en").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  force: exerciseForceEnum("force"),
  mechanic: exerciseMechanicEnum("mechanic"),
  level: exerciseLevelEnum("level"),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
  primaryMuscles: uuid("primary_muscles").array().notNull().default([]),
  secondaryMuscles: uuid("secondary_muscles").array().notNull().default([]),
  instructionsEs: text("instructions_es").array().notNull().default([]),
  defaultRestSeconds: integer("default_rest_seconds").notNull().default(90),
  isUnilateral: boolean("is_unilateral").notNull().default(false),
  tracksWeight: boolean("tracks_weight").notNull().default(true),
  tracksReps: boolean("tracks_reps").notNull().default(true),
  tracksTime: boolean("tracks_time").notNull().default(false),
  tracksDistance: boolean("tracks_distance").notNull().default(false),
  /** 'wger' | 'free-exercise-db' | 'manual' — ver docs/DATA-SOURCES.md (Fase 2). */
  source: text("source").notNull(),
  sourceId: text("source_id"),
  needsTranslation: boolean("needs_translation").notNull().default(false),
  licenseNote: text("license_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exerciseMedia = pgTable("exercise_media", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  localPath: text("local_path").notNull(),
  originalUrl: text("original_url"),
  posterPath: text("poster_path"),
  durationMs: integer("duration_ms"),
  attribution: text("attribution"),
  license: text("license"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exerciseAliases = pgTable("exercise_aliases", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  alias: text("alias").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  equipment: one(equipment, {
    fields: [exercises.equipmentId],
    references: [equipment.id],
  }),
  media: many(exerciseMedia),
  aliases: many(exerciseAliases),
}));

export const exerciseMediaRelations = relations(exerciseMedia, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseMedia.exerciseId],
    references: [exercises.id],
  }),
}));

export const exerciseAliasesRelations = relations(exerciseAliases, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseAliases.exerciseId],
    references: [exercises.id],
  }),
}));

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type Muscle = typeof muscles.$inferSelect;
export type ExerciseMedia = typeof exerciseMedia.$inferSelect;

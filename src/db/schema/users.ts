import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { newId } from "@/lib/id";

/**
 * Sólo 2 usuarios (ver CLAUDE.md §0) — sin registro público, se crean con
 * `pnpm user:create` o SEED_USERS en el primer arranque (Fase 1).
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(newId),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

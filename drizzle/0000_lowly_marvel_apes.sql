CREATE TYPE "public"."exercise_category" AS ENUM('compound', 'isolation', 'cardio', 'mobility');--> statement-breakpoint
CREATE TYPE "public"."exercise_force" AS ENUM('push', 'pull', 'static');--> statement-breakpoint
CREATE TYPE "public"."exercise_level" AS ENUM('beginner', 'intermediate', 'expert');--> statement-breakpoint
CREATE TYPE "public"."exercise_mechanic" AS ENUM('compound', 'isolation');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('video', 'image_sequence', 'gif');--> statement-breakpoint
CREATE TYPE "public"."pr_type" AS ENUM('1rm_estimated', 'weight', 'reps_at_weight', 'volume', 'time');--> statement-breakpoint
CREATE TYPE "public"."progression_type" AS ENUM('double_progression', 'linear', 'rpe_autoregulated', 'percentage_1rm', 'manual');--> statement-breakpoint
CREATE TYPE "public"."routine_goal" AS ENUM('strength', 'hypertrophy', 'endurance', 'recomp');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."set_type" AS ENUM('warmup', 'working', 'drop', 'failure', 'amrap', 'backoff');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('ppl', 'upper_lower', 'full_body', 'arnold', 'bro_split', 'custom');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exercise_aliases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exercise_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exercise_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"local_path" text NOT NULL,
	"original_url" text,
	"poster_path" text,
	"duration_ms" integer,
	"attribution" text,
	"license" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"category" "exercise_category" NOT NULL,
	"force" "exercise_force",
	"mechanic" "exercise_mechanic",
	"level" "exercise_level",
	"equipment_id" uuid,
	"primary_muscles" uuid[] DEFAULT '{}' NOT NULL,
	"secondary_muscles" uuid[] DEFAULT '{}' NOT NULL,
	"instructions_es" text[] DEFAULT '{}' NOT NULL,
	"default_rest_seconds" integer DEFAULT 90 NOT NULL,
	"is_unilateral" boolean DEFAULT false NOT NULL,
	"tracks_weight" boolean DEFAULT true NOT NULL,
	"tracks_reps" boolean DEFAULT true NOT NULL,
	"tracks_time" boolean DEFAULT false NOT NULL,
	"tracks_distance" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"needs_translation" boolean DEFAULT false NOT NULL,
	"license_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "muscles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"is_front" boolean NOT NULL,
	"svg_coordinates" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "muscles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "progression_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "progression_type" NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_days" (
	"id" uuid PRIMARY KEY NOT NULL,
	"routine_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"name" text NOT NULL,
	"weekday_hint" integer,
	"estimated_minutes" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"exercise_id" uuid NOT NULL,
	"superset_group" integer,
	"rest_seconds" integer,
	"tempo" text,
	"notes" text,
	"progression_rule_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"routine_exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"set_type" "set_type" DEFAULT 'working' NOT NULL,
	"target_reps" integer,
	"target_reps_min" integer,
	"target_reps_max" integer,
	"target_weight_kg" numeric(6, 2),
	"target_rpe" numeric(3, 1),
	"target_percent_1rm" numeric(5, 2),
	"rest_seconds_override" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"goal" "routine_goal" NOT NULL,
	"split_type" "split_type" NOT NULL,
	"days_per_week" integer NOT NULL,
	"weeks_total" integer,
	"deload_every_n_weeks" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_metrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_kg" numeric(5, 2),
	"body_fat_pct" numeric(4, 1),
	"chest" numeric(5, 1),
	"waist" numeric(5, 1),
	"arm" numeric(5, 1),
	"thigh" numeric(5, 1),
	"photo_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"type" "pr_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"set_log_id" uuid,
	"achieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plate_inventory" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bar_weight_kg" numeric(5, 2) DEFAULT '20' NOT NULL,
	"plates_available" jsonb NOT NULL,
	"unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"has_microplates" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plate_inventory_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "set_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"routine_set_id" uuid,
	"order" integer NOT NULL,
	"set_type" "set_type" DEFAULT 'working' NOT NULL,
	"weight_kg" numeric(6, 2),
	"reps" integer,
	"rpe" numeric(3, 1),
	"rir" numeric(3, 1),
	"time_seconds" integer,
	"distance_m" numeric(8, 2),
	"rest_taken_seconds" integer,
	"is_pr" boolean DEFAULT false NOT NULL,
	"failed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone,
	"client_id" uuid NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_logs_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"default_increment_kg" numeric(4, 2) DEFAULT '2.5' NOT NULL,
	"sounds_enabled" boolean DEFAULT true NOT NULL,
	"haptics_enabled" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"rest_auto_start" boolean DEFAULT true NOT NULL,
	"keep_screen_awake" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"routine_day_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_seconds" integer,
	"bodyweight_kg" numeric(5, 2),
	"mood" smallint,
	"energy" smallint,
	"notes" text,
	"total_volume_kg" numeric(10, 2),
	"total_sets" integer,
	"status" "session_status" DEFAULT 'in_progress' NOT NULL,
	"client_id" uuid NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sessions_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "exercise_aliases" ADD CONSTRAINT "exercise_aliases_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_day_id_routine_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."routine_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_progression_rule_id_progression_rules_id_fk" FOREIGN KEY ("progression_rule_id") REFERENCES "public"."progression_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_sets" ADD CONSTRAINT "routine_sets_routine_exercise_id_routine_exercises_id_fk" FOREIGN KEY ("routine_exercise_id") REFERENCES "public"."routine_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_set_log_id_set_logs_id_fk" FOREIGN KEY ("set_log_id") REFERENCES "public"."set_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plate_inventory" ADD CONSTRAINT "plate_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_routine_set_id_routine_sets_id_fk" FOREIGN KEY ("routine_set_id") REFERENCES "public"."routine_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_day_id_routine_days_id_fk" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_days_routine_idx" ON "routine_days" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "routine_exercises_day_idx" ON "routine_exercises" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "routine_sets_routine_exercise_idx" ON "routine_sets" USING btree ("routine_exercise_id");--> statement-breakpoint
CREATE INDEX "routines_user_idx" ON "routines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "body_metrics_user_date_idx" ON "body_metrics" USING btree ("user_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "personal_records_user_exercise_idx" ON "personal_records" USING btree ("user_id","exercise_id","achieved_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "set_logs_session_order_idx" ON "set_logs" USING btree ("session_id","order");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_started_idx" ON "workout_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);
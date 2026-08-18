# Schema — Iron Log

17 tablas, definidas en `src/db/schema/*.ts` (Drizzle, SQL-first). Migración generada
en `drizzle/0000_lowly_marvel_apes.sql`. PKs `uuid` generadas con `uuidv7()` en
`src/lib/id.ts` (mismo algoritmo que usará el outbox offline en Fase 5).

## Convenciones

- `created_at` / `updated_at` en todas las tablas.
- `client_id` (uuid v7, `UNIQUE`) + `synced_at` sólo en las tablas que se crean offline
  y sincronizan después: `workout_sessions`, `set_logs`.
- `ON DELETE CASCADE` desde el dueño natural del dato (`users`, `routines`,
  `workout_sessions`) hacia abajo. **Excepción a propósito:** `set_logs.exercise_id`
  y `routine_exercises.exercise_id` son `ON DELETE RESTRICT` — no se puede borrar un
  ejercicio del catálogo si tiene historial o rutinas que lo referencian; el catálogo
  se cura, no se poda a ciegas.
- Borrar una rutina nunca borra `set_logs`: `workout_sessions.routine_day_id` y
  `set_logs.routine_set_id` son `ON DELETE SET NULL`, así el historial de lo que
  realmente se entrenó sobrevive aunque la rutina que lo originó se edite o archive.

## Diagrama ER

```mermaid
erDiagram
    users ||--o{ routines : "crea"
    users ||--o{ workout_sessions : "entrena"
    users ||--o{ personal_records : "logra"
    users ||--o{ body_metrics : "registra"
    users ||--o| plate_inventory : "configura"
    users ||--o| user_settings : "configura"

    equipment ||--o{ exercises : "requiere"
    muscles }o--o{ exercises : "primary/secondary (uuid[])"
    exercises ||--o{ exercise_media : "tiene"
    exercises ||--o{ exercise_aliases : "tiene"
    exercises ||--o{ routine_exercises : "se prescribe en"
    exercises ||--o{ set_logs : "se registra en"

    routines ||--o{ routine_days : "tiene"
    routine_days ||--o{ routine_exercises : "tiene"
    routine_exercises ||--o{ routine_sets : "prescribe"
    routine_exercises }o--o| progression_rules : "usa"
    routine_days ||--o{ workout_sessions : "origina"

    workout_sessions ||--o{ set_logs : "contiene"
    routine_sets ||--o{ set_logs : "referencia (nullable)"
    set_logs ||--o| personal_records : "puede ser"

    users {
        uuid id PK
        text email UK
        text password_hash
        text name
    }

    exercises {
        uuid id PK
        text slug UK
        text name_es
        text name_en
        enum category
        enum force
        enum mechanic
        enum level
        uuid equipment_id FK
        uuid[] primary_muscles
        uuid[] secondary_muscles
        text[] instructions_es
        boolean needs_translation
        text source
    }

    equipment {
        uuid id PK
        text slug UK
        text name_es
        text name_en
    }

    muscles {
        uuid id PK
        text slug UK
        text name_es
        boolean is_front
        jsonb svg_coordinates
    }

    exercise_media {
        uuid id PK
        uuid exercise_id FK
        enum type
        text local_path
        text attribution
        text license
        boolean is_primary
    }

    exercise_aliases {
        uuid id PK
        uuid exercise_id FK
        text alias
    }

    routines {
        uuid id PK
        uuid user_id FK
        text name
        enum goal
        enum split_type
        int days_per_week
        boolean is_active
        timestamp archived_at
    }

    routine_days {
        uuid id PK
        uuid routine_id FK
        int order
        text name
        int weekday_hint
    }

    routine_exercises {
        uuid id PK
        uuid day_id FK
        int order
        uuid exercise_id FK
        int superset_group
        text tempo
        uuid progression_rule_id FK
    }

    routine_sets {
        uuid id PK
        uuid routine_exercise_id FK
        int set_number
        enum set_type
        int target_reps_min
        int target_reps_max
        numeric target_weight_kg
        numeric target_rpe
    }

    progression_rules {
        uuid id PK
        enum type
        jsonb params
    }

    workout_sessions {
        uuid id PK
        uuid user_id FK
        uuid routine_day_id FK
        timestamp started_at
        timestamp finished_at
        enum status
        uuid client_id UK
        timestamp synced_at
    }

    set_logs {
        uuid id PK
        uuid session_id FK
        uuid exercise_id FK
        uuid routine_set_id FK
        numeric weight_kg
        int reps
        numeric rpe
        boolean is_pr
        uuid client_id UK
        timestamp synced_at
    }

    personal_records {
        uuid id PK
        uuid user_id FK
        uuid exercise_id FK
        enum type
        numeric value
        uuid set_log_id FK
        timestamp achieved_at
    }

    body_metrics {
        uuid id PK
        uuid user_id FK
        date date
        numeric weight_kg
        numeric body_fat_pct
    }

    plate_inventory {
        uuid id PK
        uuid user_id FK "UNIQUE"
        numeric bar_weight_kg
        jsonb plates_available
        enum unit
    }

    user_settings {
        uuid id PK
        uuid user_id FK "UNIQUE"
        enum unit
        numeric default_increment_kg
        boolean sounds_enabled
        boolean haptics_enabled
        text theme
        text language
    }
```

## Índices explícitos

| Tabla | Índice | Para |
|---|---|---|
| `workout_sessions` | `(user_id, started_at DESC)` | historial paginado |
| `set_logs` | `(session_id, order)` | reconstruir una sesión en orden |
| `personal_records` | `(user_id, exercise_id, achieved_at DESC)` | gráfica de PRs por ejercicio |
| `routines`, `routine_days`, `routine_exercises`, `routine_sets`, `body_metrics` | por FK padre | listar hijos de un padre sin table scan |

## `muscles` sin FK real en `exercises.primary_muscles[]`

Postgres no soporta FK sobre elementos de un array nativamente. Es una decisión
consciente (no una limitación olvidada): la integridad se garantiza en el seed
(Fase 2), que es la única escritura de este campo — el usuario nunca edita el
catálogo directamente.

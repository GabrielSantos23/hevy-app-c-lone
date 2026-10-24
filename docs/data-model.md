# Data model

Part 1 summarizes the reference app's entities as seen in its request/response shapes (field names only). Part 2 is my own local-first schema for expo-sqlite + Drizzle, with social, coaching and monetization removed.

## 1. Reference app entities (observed)

- **Workout**: `id, title, description, start_time, end_time` (unix seconds), `routine_id, exercises[], apple_watch, wearos_watch, biometrics { total_calories, heart_rate_samples[{ bpm, timestamp_ms }] }` + social/coach fields (dropped).
- **Workout exercise**: `exercise_template_id, title, superset_id, rest_timer_seconds/rest_seconds, notes, pinned_notes, volume_doubling_enabled, sets[]`.
- **Set**: `index, type|indicator (normal|warmup|dropset|failure), weight_kg, reps, distance_meters, duration_seconds, custom_metric (floors/steps), rpe, completed_at`. Routine sets also have `rep_range { start, end }`.
- **Routine**: `title, folder_id, index, notes, exercises[]` (same exercise and set shape, no completion), `parent_routine_id`.
- **Routine folder**: `id, title, index`.
- **Exercise template**: `id, title, exercise_type, equipment_category, muscle_group, other_muscles[], is_custom`, a "100% bodyweight" flag, localized titles.
- **Measurement**: `date, weight_kg, fat_percent`, 14 circumference sites in cm, progress photo.
- **Preferences**: weight unit (kg/lbs), distance unit (kilometers/miles), body measurement unit (cm/in), previous-values mode (any workout / same routine), RPE tracking on/off, default rest timer, rest timer sounds/notification, warm-up formula, plates/bars, theme, first weekday.

## 2. My local schema

Conventions:

- IDs are text: random UUIDs (`expo-crypto` `randomUUID`) for user rows, safe for future sync. Seeded library rows use stable `seed:<source id>` IDs. Ordering uses `created_at`/`position`, never the ID.
- Every row has `created_at`, `updated_at` (epoch ms) and `deleted_at` (soft delete, a sync tombstone).
- Canonical units: kg, meters, seconds, cm. Unit conversion happens only in the UI and CSV.
- Every table also gets `import_batch_id` (nullable) where imports can create rows, so an import can be reverted.

### exercise

| column            | type              | notes                                                                                   |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------- |
| id                | text pk           |                                                                                         |
| name              | text              | default language name                                                                   |
| name_pt           | text null         | pt-BR name for seeded exercises                                                         |
| type              | text              | one of the 10 logging types                                                             |
| equipment         | text              | none, barbell, dumbbell, kettlebell, machine, plate, resistance_band, suspension, other |
| primary_muscle    | text              | 20-value muscle enum                                                                    |
| secondary_muscles | text (JSON array) |                                                                                         |
| bodyweight_factor | real              | 0 or 1. Counts body weight in volume (their "100% bodyweight")                          |
| is_custom         | int bool          |                                                                                         |
| source            | text null         | `seed:<dataset>@<version>` for library rows                                             |
| source_id         | text null         | id in the open dataset                                                                  |
| instructions      | text null         | from the open dataset only                                                              |
| import_batch_id   | text null         |                                                                                         |

### folder

`id, name, position`

### routine

`id, folder_id → folder null, name, notes, position`

### routine_exercise

`id, routine_id → routine, exercise_id → exercise, position, superset_group int null, rest_seconds int null, notes, volume_doubling int bool`

### routine_set

`id, routine_exercise_id, position, set_type, weight_kg null, reps null, rep_min null, rep_max null, duration_s null, distance_m null, custom_metric null, target_rpe null`

### workout

| column          | type      | notes                           |
| --------------- | --------- | ------------------------------- |
| id              | text pk   |                                 |
| routine_id      | text null | the routine it was started from |
| name            | text      |                                 |
| notes           | text null |                                 |
| started_at      | int       | epoch ms                        |
| ended_at        | int null  | null while in progress          |
| status          | text      | `in_progress`, `finished`       |
| import_batch_id | text null |                                 |

Only one workout can be `in_progress` (partial unique index). That's how an unfinished session survives an app kill.

### workout_exercise

`id, workout_id, exercise_id, position, superset_group int null, rest_seconds int null, notes, volume_doubling int bool`

### workout_set

`id, workout_exercise_id, position, set_type (normal|warmup|dropset|failure), weight_kg null, reps null, duration_s null, distance_m null, custom_metric null, rpe null, completed_at int null`

- Volume, 1RM and PRs are computed from these rows, not stored.
- `personal_record` is a derived cache table (`exercise_id, kind, value, workout_set_id, achieved_at`) that's rebuilt when history changes. It's there only for fast lookups.

### health_link

Connects one app workout to one Apple Health workout.

| column             | type                       | notes                     |
| ------------------ | -------------------------- | ------------------------- |
| id                 | text pk                    |                           |
| workout_id         | text unique → workout      |                           |
| hk_uuid            | text unique                | HKWorkout UUID            |
| activity_type      | text                       |                           |
| hk_start / hk_end  | int                        | epoch ms                  |
| active_energy_kcal | real null                  |                           |
| avg_hr / max_hr    | real null                  |                           |
| hr_samples         | text (JSON `[[t_ms,bpm]]`) | copied for offline charts |
| link_mode          | text                       | `auto`, `manual`          |

Unlinking deletes the `health_link` row and records the HK UUID in **dismissed_health_workout** (`hk_uuid pk, dismissed_at`), so auto-matching never links it again.

`exported_hk_uuid` on `workout` (nullable) records a workout this app wrote to Health. That avoids writing it twice and keeps it from matching itself.

### measurement

`id, measured_at, weight_kg, fat_percent, neck_cm, shoulder_cm, chest_cm, left_bicep_cm, right_bicep_cm, left_forearm_cm, right_forearm_cm, abdomen_cm, waist_cm, hips_cm, left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm, import_batch_id`. All nullable except `measured_at`. Columns line up 1:1 with the CSV.

### import_batch

`id, source (hevy|strong), file_name, imported_at, workouts_count, exercises_count, measurements_count, reverted_at`. Reverting soft-deletes every row with that batch id and sets `reverted_at`.

### Preferences (not a table)

Preferences live in `expo-sqlite/kv-store` through a persisted Zustand store (`src/stores/preferences.ts`). They're read synchronously at boot (theme, locale) without waiting for migrations: `theme, locale, weightUnit, distanceUnit, lengthUnit, previousValuesMode (any|routine), rpeEnabled, defaultRestSeconds, restNotification, oneRmFormula, countWarmupsInVolume, weekStart, bodyWeightKg`.

### account (single row, local)

`mode (signed_out|signed_in), user_id null, email null, last_sync_at null`. No password or token stored in SQLite: tokens go in `expo-secure-store` once sync exists.

## Not modeled (removed on purpose)

Followers, feed, likes, comments, privacy/visibility, shared media, gyms, leaderboards, contacts, trainer/coach programs, subscriptions, referral, notifications from other users.

## Relationships

```
folder 1─* routine 1─* routine_exercise 1─* routine_set
exercise 1─* routine_exercise
routine 1─* workout 1─* workout_exercise 1─* workout_set
exercise 1─* workout_exercise
workout 1─0..1 health_link
import_batch 1─* (workout, exercise, measurement)
```

## Records (phase 7 decision)

Personal records are computed on read from `workout_set` history (`scanRecords` in `src/features/stats/calc.ts`): warm-ups are skipped, and a set counts as a PR when it beats the best earlier value of a record kind, except in the exercise's first session. The `personal_record` table is not written yet; it stays in the schema as a cache to fill if history ever gets large enough for the scan to be slow.

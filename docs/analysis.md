# Reference app analysis

Notes from studying the Android build of the reference workout tracker (v3.2.2, build 3398745, APKMirror `.apkm` bundle). They describe features, flows, data shapes and calculations in my own words. No code, assets, copy or visual design were taken, and none of the APK or decompiled output is stored in this repo (see `.gitignore`).

## How it was inspected

| Step                                           | Tool                                          | Result                                                                                                                                  |
| ---------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Unpack `.apkm` → `base.apk` + 37 config splits | unzip                                         | Splits are only ABI, density and language                                                                                               |
| Framework detection                            | file layout, `assets/app.config`, native libs | React Native on Expo                                                                                                                    |
| Manifest permissions                           | `strings -el` on binary `AndroidManifest.xml` | List below                                                                                                                              |
| JS bundle                                      | `hermes-dec` (`hbc-decompiler`), bytecode v96 | 89 MB pseudo-JS, function names preserved                                                                                               |
| REA `inspect_android_package`                  | REA MCP                                       | Not usable here: needs a local `jadx-headless-mcp` JAR (`REA_JADX_MCP_JAR`). Java/Kotlin side is just RN host code, so nothing was lost |

The decompiled output stayed in a temporary scratch folder outside the repo.

## Tech stack (what they ship)

- **Expo SDK 54**, React Native, **Hermes** engine (bytecode v96), New Architecture (`libappmodules.so`, codegen libs).
- `react-native-screens`, `react-native-reanimated` + worklets, gesture handler, Nitro Modules.
- VisionCamera + ML Kit barcode (progress photos, QR), Rive animations, img.ly photo/video editor (social sharing).
- Sentry, Firebase messaging, ads attribution SDKs.
- `papaparse` for CSV, `dayjs` for dates, MobX-style stores (`CurrentUserWorkoutsStore`, `*ViewModelClass`).
- Health Connect on Android (`com.hevy.healthconnect`), Wear OS app, Apple Watch app on iOS.

Takeaway for my build: Expo SDK + dev builds is the same proven path, so their stack choices confirm mine. They're server-first, though: almost every read goes through an API, and the local store is just a cache. Mine has to be local-first.

## Android permissions of note

- Health Connect: read/write weight and body fat, write exercise, heart rate, total calories.
- `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `FOREGROUND_SERVICE(_SPECIAL_USE)`, `WAKE_LOCK`, `VIBRATE`: rest timer and live workout notification.
- `CAMERA` (progress photos), location (gyms, social), contacts (friend finding, social: excluded).

## Feature map

Screens were found by component name (`*Screen`). Grouped by what I'll keep.

### Keep (core)

| Area             | Their screens                                                                                                                                                                  | What it does                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exercise library | ExerciseLibrary, ExerciseDetail, ExerciseHistory, ExerciseHowTo, CreateExercise, ExerciseTypeSelection, SelectEquipment, SelectPrimaryMuscleGroup, SelectSecondaryMuscleGroups | Search, filter by muscle and equipment, detail with history/records/charts, custom exercise wizard (type → equipment → primary → secondary muscles) |
| Routines         | CreateRoutine, RoutineDetail, Folder, ReorderFolders, ReorderExercises, RoutineTrackingSetting                                                                                 | Routines with exercises, target sets, rep ranges, rest per exercise, notes; folders with ordering                                                   |
| Logging          | LiveWorkout, MinimizedWorkout, FinishWorkout, AddExerciseModal, WarmupSets, WarmupCalculatorSettings, AvailableWeights (plate calculator), WorkoutSetting                      | Live session that can be minimized, set types, RPE, supersets, rest timer, previous values, warm-up calculator, plate calculator                    |
| History          | WorkoutDetail, Calendar, WorkoutDay                                                                                                                                            | List of finished workouts, calendar with workout days, edit past workouts                                                                           |
| Stats            | AdvancedStats, MuscleDistribution, MuscleGroupGraph, SetCountPerMuscleGroup, ProgressReport                                                                                    | Volume/duration/reps graphs, per-exercise charts, muscle distribution and sets per muscle                                                           |
| Measurements     | Measurements, ProgressPicturesList, ProgressPictureCamera                                                                                                                      | Body weight, fat %, 14 circumference sites, progress photos                                                                                         |
| Settings         | Units, ThemeSetting, SoundsSetting, NotificationSetting, ExportData, ImportData, AppleHealthSetting, HealthConnectOnboarding                                                   | Units, theme, sounds, export/import, health integrations                                                                                            |
| Auth             | Login, Signup, ForgotPassword, ChangeEmail, UpdatePassword                                                                                                                     | Kept as optional account for future sync                                                                                                            |

### Drop (social or business-specific)

Feed, AllFeedCells, Comment, Follower/Following/MutualFollowers, FollowRequest, Contacts/ContactSync, Explore, Search users, UserProfile/CompareUser*, Leaderboards (exercise and gym), GymProfile, Invite, ShareWorkout/Shareables, WorkoutVisibility/PrivacySocial, BlockedUsers, Report, YearInReview, Paywall/subscription/affiliate, AI coach and trainer programs, rating prompts, email consent, onboarding questionnaires.

Things I'll drop from the data model too: `is_private`, `is_biometrics_public`, `media` (shared photos), `gym_id`, `trainer_*`, `program_id`, `coach_force_rpe_enabled`, likes and comments.

## Key flows

1. **Start workout**: empty, or from a routine. Starting from a routine copies its exercises and sets. Each set's "previous" value comes from the user's history (see below).
2. **Log a set**: enter weight/reps (or duration/distance, depending on exercise type) and tap complete. Completing a set starts the auto rest timer if that exercise has a rest value.
3. **Set type**: normal, warm-up, drop set or failure. Set numbering skips warm-ups (they're labeled differently).
4. **Superset**: link two or more exercises with a shared `superset_id`. In a superset, "next set" moves to the next exercise in the group.
5. **Finish**: title, description, start time and duration are editable. The workout is saved with its sets; only completed sets count. If it started from a routine, the user can update the routine with the new values (RoutineTrackingSetting: "update routine values").
6. **Edit a past workout**: same editor, opened from history.
7. **Export**: Settings → Export → workouts CSV or measurements CSV, then the share sheet.
8. **Import Strong**: they upload the CSV to their server, which creates workouts and the missing custom exercises. Imports can be rolled back as one batch. I'll do this locally and keep the rollback idea (tag every imported row with an `import_batch_id`).

## Exercise types

Ten logging types decide which columns a set shows and which records apply:

| Type                       | Inputs           | Notes                       |
| -------------------------- | ---------------- | --------------------------- |
| `weight_reps`              | weight, reps     | Barbell bench etc.          |
| `reps_only`                | reps             | Plain bodyweight            |
| `bodyweight_reps`          | +weight, reps    | Weighted pull-up            |
| `bodyweight_assisted_reps` | −weight, reps    | Assisted machine            |
| `duration`                 | time             | Plank                       |
| `weight_duration`          | weight, time     | Weighted plank, farmer hold |
| `distance_duration`        | distance, time   | Running                     |
| `short_distance_weight`    | weight, distance | Sled, farmer walk           |
| `floors_duration`          | floors, time     | Stair machine               |
| `steps_duration`           | steps, time      | Walking                     |

Floors and steps go in a generic `custom_metric` set field.

Muscle groups (20): abdominals, abductors, adductors, biceps, calves, cardio, chest, forearms, full_body, glutes, hamstrings, lats, lower_back, neck, quadriceps, shoulders, traps, triceps, upper_back, other.

Equipment: the classic list is `none, barbell, dumbbell, kettlebell, machine, plate, resistance_band, suspension, other`. A newer detailed list (33 values, e.g. ez_bar, smith_machine, cable variants) seems to be for plate/equipment availability settings. I'll use the classic 9 for filtering.

## Calculations

All weights are stored in kg, distances in meters, durations in seconds. Units are converted only for display and export.

### Unit conversion

- lb = kg × 2.20462; inch = cm / 2.54; mile = 1609.34 m.

### Set volume (`setVolumeKg`)

`w` = weight in kg, doubled when per-exercise "volume doubling" is on (for one-arm dumbbell work). `bw` = user body weight. `full` = whether the exercise moves 100% of body weight (a per-exercise flag).

| Type                     | Volume                             |
| ------------------------ | ---------------------------------- |
| weight_reps              | w × reps                           |
| reps_only                | full ? bw × reps : 0               |
| bodyweight_reps          | full ? (w + bw) × reps : w × reps  |
| bodyweight_assisted_reps | full ? max((bw − w) × reps, 0) : 0 |
| short_distance_weight    | distance × w                       |
| weight_duration          | w                                  |
| others                   | 0                                  |

Workout volume = sum over completed sets. Warm-ups count unless filtered. I'll check whether they exclude warm-ups from volume during phase 7 tests, and I'll make it a setting.

### Estimated 1RM (`oneRepMax`)

A percent-of-1RM table, not Epley/Brzycki: `1RM = weight / pct[reps]`, with pct for 1–30 reps:

```
1:1.00 2:.97 3:.94 4:.92 5:.89 6:.86 7:.83 8:.81 9:.78 10:.75
11:.73 12:.71 13:.70 14:.68 15:.67 16:.65 17:.64 18:.63 19:.61 20:.60
21:.59 22:.58 23:.57 24:.56 25:.55 26:.54 27:.53 28:.52 29:.51 30:.50
```

reps > 30 → 0.5. reps = 0 → 0. Only `weight_reps` exercises get a 1RM record. For 1–10 reps the table matches Brzycki (`pct = (37 − reps) / 36`) to two decimals. After that it flattens out more slowly. My plan is Brzycki for 1–10 reps, then a linear taper to 0.5 at 30, with Epley as an option. That gives near-identical numbers without copying their table.

### Personal records

Record kinds: `best_weight`, `best_reps`, `best_volume` (single set), `best_1rm`, `best_duration`, `best_distance`, `most_floors`, `most_steps`. Which ones apply depends on the exercise type:

| Record         | Types                                                                         |
| -------------- | ----------------------------------------------------------------------------- |
| weight         | weight_reps, bodyweight_reps, short_distance_weight, weight_duration          |
| volume         | weight_reps, bodyweight_reps, short_distance_weight, weight_duration          |
| 1RM            | weight_reps                                                                   |
| reps           | reps_only, bodyweight_assisted_reps                                           |
| distance       | distance_duration, short_distance_weight                                      |
| duration       | duration, weight_duration, distance_duration, floors_duration, steps_duration |
| floors / steps | floors_duration / steps_duration                                              |

A set is a PR when it beats the best previous value of that kind. Warm-ups are excluded (assumption, to confirm in tests). PRs show live during logging.

### Progress status

Per exercise, compare the latest 1RM with the first in the window: higher → progressing; ≥ 90% → maintaining; < 90% → regressing; fewer than 2 points → maintaining.

### Muscle distribution

Each set adds 1 to the exercise's primary muscle and 0.5 to each secondary muscle. Warm-ups are optional (`includeWarmupSets`). Applied to sets in the chosen period (also used for "sets per muscle group" on routines).

### Estimated routine duration

Per set: duration-type exercises use the set's duration, everything else 45 s. Add the exercise rest (default 90 s) after every set, except when the set is a drop set.

### Previous values

Setting "Previous workout values": **any workout** (default; last time the exercise was done) or **same routine** (last time inside the current routine). The "previous" column shows the set at the same position in that past session. RPE can be pre-filled from the previous set too (`addPreviousRpe`).

### Other helpers worth copying as ideas

- **RPE options**: 6, 7, 7.5, 8, 8.5, 9, 9.5, 10.
- **Warm-up calculator**: a list of steps, each a % of target weight × reps, inserted as warm-up sets and rounded to available plates.
- **Plate calculator**: bars + plates per unit, editable; reports the closest weight you can load.
- **Long-workout warning** on finish when the duration looks wrong (forgot to stop).

## CSV export format (to be compatible)

Built with papaparse `unparse`, `quotes: v => typeof v === 'string'`: strings are always double-quoted, numbers and empty values are not. Rows are joined with `\n`. Header only once. In text fields, line breaks are replaced with the two characters `\n`. Dates use dayjs format `D MMM YYYY, HH:mm` (e.g. `14 Mar 2025, 18:05`). One row per set; workout fields repeat on every row.

### Workouts

```
title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
```

- `weight_kg` becomes `weight_lbs` and `distance_km` becomes `distance_miles` when the user's units are imperial; values are converted.
- `set_type`: `normal | warmup | dropset | failure`.
- `superset_id`: number or empty. `set_index`: position in the exercise (0-based, to verify against a real export).
- `exercise_title` is the localized exercise name.
- Values that are 0 or missing for weight/distance are left empty.

### Measurements

```
date,weight_kg,fat_percent,neck_cm,shoulder_cm,chest_cm,left_bicep_cm,right_bicep_cm,left_forearm_cm,right_forearm_cm,abdomen_cm,waist_cm,hips_cm,left_thigh_cm,right_thigh_cm,left_calf_cm,right_calf_cm
```

- With imperial units: `weight_lbs` and `*_in`.

### Strong import (not in the app, done server side)

Their importer runs on the server, so I'll work from Strong's public export format: `Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE`. Older versions also have `Weight Unit` and `Distance Unit`; newer ones use `;` as the separator. To check against a real Strong file in phase 8.

## Health data

The workout upload includes `apple_watch` / `wearos_watch` flags and `biometrics: { total_calories, heart_rate_samples: [{ bpm, timestamp_ms }] }`. That's the same shape I need when linking an Apple Watch workout from HealthKit, so I'll store it the same way: a link to the HK workout UUID, plus calories and HR samples copied locally.

## Unsure / to verify

- Whether `set_index` is 0- or 1-based in exported files, and whether month names in dates are localized (dayjs locale). Needs a real export file.
- Whether warm-ups count toward workout volume and PRs. Their code supports both, so I'll make it a setting and default to excluding them.
- Exact rounding of lbs values in export (they go through a `weight(kg, unit)` formatter).
- Strong CSV columns (from public knowledge, not from the APK).

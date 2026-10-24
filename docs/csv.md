# CSV import and export

Profile → Import & export. The code is in `src/features/csv/` (`csv.ts` parses and writes, `match.ts` maps exercise names, `data.ts` talks to the database).

## Export

Same layout as Hevy's export, checked against a real Hevy file: exporting a parsed copy of it reproduces all 3,201 lines byte for byte.

- Workouts: `title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg, reps, distance_km, duration_seconds, rpe`, one row per set.
- Measurements: `date, weight_kg, fat_percent, neck_cm … right_calf_cm`.
- Text is always quoted (`""` when empty), numbers and empty values are not, line breaks become `\n`, dates are `D MMM YYYY, HH:mm`.
- With pounds/miles/inches set, the columns become `weight_lbs`, `distance_miles` and `*_in`, with converted values.
- Files are written to the cache folder and handed to the system share sheet (`expo-sharing`).

## Import

The file type is detected from its header: Hevy workouts, Hevy measurements, or Strong (`,` or `;` separated, `W`/`D`/`F` set orders, rest-timer rows skipped, `Weight Unit` respected).

- Each import is one `import_batch`. **Undo** soft-deletes its workouts, measurements and the exercises it created.
- Workouts already present (same name and start time) and measurements on an existing date are skipped, so importing the same file twice adds nothing.
- A Hevy row with `set_index` 0 starts a new exercise entry, so an exercise logged twice in a row stays as two entries.

### Exercise names

1. Hevy's built-in names that differ from ours are mapped in `hevy-aliases.ts` (for example `Shoulder Press (Machine Plates)` → `Lever Shoulder Press`). A test checks every target exists and logs weight and reps.
2. Exact name match with the library (case and punctuation ignored).
3. `Bench Press (Barbell)` also tries `Barbell Bench Press` and `Bench Press Barbell`.
4. The part in parentheses is dropped only when our exercise uses the same equipment (Cable and Machine both count as machine). `Chin Up (Assisted)` therefore does not become `Chin-Up`.
5. Anything else becomes a custom exercise with the original name. Its logging type comes from which columns have data, equipment from the parentheses, and the primary muscle from keywords in the name.

With the author's Hevy export: 173 workouts, 3,200 sets, 63 exercise names; all 63 match a library exercise (with picture), so no custom exercises are created.

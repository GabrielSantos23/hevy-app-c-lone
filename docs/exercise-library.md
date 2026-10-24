# Exercise library

## Sources

| What | Source | License |
|---|---|---|
| Exercise list (titles, muscle folder) and animations | Local GIF folder (`D:\projects\gym-gifs\gifs`, 1,407 GIFs). The files originate from fitnessprogramer.com, as listed by [azilRababe/Exercises_Dataset](https://github.com/azilRababe/Exercises_Dataset) | **No license.** That repo has no LICENSE file, and its scraper only links to fitnessprogramer.com |
| 650 more exercises with their photos, plus instructions (750 exercises in total) | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) at commit `f00c92c` | The Unlicense (public domain) |

No names, data, images or media come from the reference app.

**Media is personal-use only.** The GIFs aren't openly licensed, so:

- The GIF-derived media is personal-use only; the free-exercise-db photos are public domain, but they live in the same git-ignored folder.
- The converted media (`assets/exercise-media/`) and its require map (`src/features/exercises/media.generated.ts`) are git-ignored and never committed.
- A clone without the GIF folder still builds and runs: rows show a placeholder icon and the detail screen skips the animation.
- Before a public repo or store release, the media must be replaced with licensed or self-made animations.

## Building

```bash
npm run library:build
```

`scripts/build-exercise-library.mts`:

1. Reads every `.gif` under `EXERCISE_GIFS_DIR` (default `D:/projects/gym-gifs/gifs`); each subfolder is a muscle group.
2. Builds the library with `src/features/exercises/gif-mapper.ts`, then adds every free-exercise-db exercise whose normalized name isn't already there (`fedb-mapper.ts`). It skips stretches and the 3 entries that have no images. Both mappers are tested.
3. Converts each GIF with `sharp` to a 240 px animated WebP (~40 KB). The two free-exercise-db photos become a 2-frame WebP that switches every second. There is one file per exercise: the list shows its first frame (`autoplay={false}`). Two files per exercise pushed Metro past Windows' open-file limit (`EMFILE`). It skips files that already exist, so reruns are quick.
4. Writes `src/db/seed/exercises.json` (committed) and the generated media map.

Result: **1,661 exercises** (1,011 from 1,407 GIFs + 650 from free-exercise-db), about 47 MB of media.

On launch the app applies the seed whenever `version` in the JSON differs from SQLite's `PRAGMA user_version`. It upserts by `(source, source_id)`, restores rows that come back, and soft-deletes seeded rows no longer in the list. Custom exercises are never touched.

## Mapping rules

- **Stretches** (titles containing "stretch") are dropped.
- **Duplicates**: 252 titles appear in several folders. They're merged into one exercise, and the other folders become secondary muscles.
- **Primary muscle**:
  - Cardio wins when present.
  - Otherwise the name decides when it's clear: pulldown/pull-up/chin-up → lats; deadlift/leg curl/good morning → hamstrings; hip thrust/glute/bridge → glutes; shrug → traps; squat/lunge/leg press → quads.
  - Otherwise the folder decides: back → upper back, leg → quads, erector-spinae → lower back, and so on.
- **Equipment**, from keywords in the title:
  - barbell / EZ / Z-bar / T-bar / landmine and classic barbell lifts (bench press, deadlift, military press…) → barbell
  - dumbbell, plus curl/raise/shrug names with no other equipment word → dumbbell
  - cable / lever / machine / smith / pulley / leg press → machine
  - band / gymstick → band; TRX / rings → suspension; medicine or stability ball, battle rope → other
  - anything else → bodyweight
- **Logging type**:
  - cardio machines and running/walking → distance and time; stair climber → floors and time; other cardio → time
  - planks, holds, dead hangs, back/front lever → time (weight and time if equipment)
  - farmer's walk / carries / sled → weight and distance
  - "assisted" → assistance and reps; "weighted …" → added weight and reps
  - bodyweight → reps; everything else → weight and reps
- **Body weight in volume**: bodyweight, assisted and weighted-bodyweight moves count 100% body weight.
- **Instructions**: GIF exercises get free-exercise-db instructions only when the normalized names match exactly. 750 exercises have instructions; the rest have none.
- **free-exercise-db entries** keep the dataset's muscles, with "middle back" mapped to upper back. Equipment is mapped directly: cable → machine, e-z bar → barbell, foam roll/balls/other → other. Logging type uses the same title rules; `static` force means time.

## Known gaps

- Inference from titles is a heuristic. Some equipment or type picks will be wrong ("Towel Leg Curl" → machine), and seeded exercises can't be edited in the app yet.
- Names that differ only slightly appear twice ("Triceps Pushdown" and "Push-down").
- Names are English only. `name_pt` exists in the schema and search already reads it.

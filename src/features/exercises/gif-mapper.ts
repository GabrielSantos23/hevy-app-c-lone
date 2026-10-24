import type { Equipment, ExerciseType, Muscle } from '@/db/schema';

export type GifEntry = { folder: string; title: string };

export type SeedExercise = {
  source: string;
  sourceId: string;
  name: string;
  type: ExerciseType;
  equipment: Equipment;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  bodyweightFactor: 0 | 1;
  instructions: string | null;
};

const folderMuscle: Record<string, Muscle> = {
  chest: 'chest',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  back: 'upper_back',
  leg: 'quadriceps',
  abs: 'abdominals',
  calf: 'calves',
  forearm: 'forearms',
  trapezius: 'traps',
  'erector-spinae': 'lower_back',
  neck: 'neck',
  cardio: 'cardio',
  'full-body': 'full_body',
};

const folderPriority = Object.keys(folderMuscle);

const nameMuscle: [RegExp, Muscle][] = [
  [/pull-?down|pull-?up|chin-?up|pullover|lat\b/i, 'lats'],
  [/leg curl|deadlift|good morning|hamstring|nordic/i, 'hamstrings'],
  [/hip thrust|glute|kickback|bridge|donkey kick|fire hydrant/i, 'glutes'],
  [/abduct/i, 'abductors'],
  [/adduct/i, 'adductors'],
  [/calf raise/i, 'calves'],
  [/shrug/i, 'traps'],
  [/squat|lunge|leg press|leg extension|step-?up/i, 'quadriceps'],
];

const equipmentRules: [RegExp, Equipment][] = [
  [/^bodyweight\b/i, 'none'],
  [/barbell|\bez[- ]?bar|trap bar|landmine|t-bar/i, 'barbell'],
  [/dumbbell/i, 'dumbbell'],
  [/kettlebell/i, 'kettlebell'],
  [/cable|machine|smith|lever|pull-?down|\bsled\b|leg press|pec deck|belt squat/i, 'machine'],
  [/band|resistance|gymstick/i, 'resistance_band'],
  [/pulley|leg curl|leg extension|hack squat|pendulum squat/i, 'machine'],
  [/\bplate\b|svend press/i, 'plate'],
  [
    /z-bar|bench press|military press|overhead squat|zercher|stiff leg deadlift|pin squat/i,
    'barbell',
  ],
  [
    /hammer curl|concentration curl|zottman|arnold press|lateral raise|biceps curl|wrist curl|shrug|scott press|waiter curl/i,
    'dumbbell',
  ],
  [/\btrx\b|suspension|\brings?\b/i, 'suspension'],
  [/medicine ball|stability ball|bosu|battle rope|\bball\b/i, 'other'],
  [
    /^(bench press|deadlift|squat|front squat|back squat|overhead press|military press|good morning|hip thrust|power clean|hang clean|clean and jerk|snatch|push press|rack pull|sumo deadlift|romanian deadlift)$/i,
    'barbell',
  ],
];

const isStretch = (title: string) => /stretch/i.test(title);

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function inferEquipment(title: string): Equipment {
  return equipmentRules.find(([re]) => re.test(title))?.[1] ?? 'none';
}

export function inferType(title: string, equipment: Equipment, primary: Muscle): ExerciseType {
  const bodyweight = equipment === 'none';
  if (primary === 'cardio') {
    if (/stair/i.test(title)) return 'floors_duration';
    if (
      /treadmill|run|sprint|walk|jog|bike|bicycl|cycl|elliptical|rowing machine|ski|swim/i.test(
        title,
      )
    )
      return 'distance_duration';
    if (bodyweight) return 'duration';
  }
  if (/farmer|carry|\bsled\b/i.test(title)) return 'short_distance_weight';
  if (
    /plank|hold|wall sit|dead hang|isometric|\bl-sit|hollow|^(back|front) lever$|pose|vacuum/i.test(
      title,
    )
  )
    return bodyweight ? 'duration' : 'weight_duration';
  if (/assisted/i.test(title)) return 'bodyweight_assisted_reps';
  if (/^weighted/i.test(title)) return 'bodyweight_reps';
  return bodyweight ? 'reps_only' : 'weight_reps';
}

export function buildLibrary(
  entries: GifEntry[],
  instructionsByName: Map<string, string>,
): SeedExercise[] {
  const byTitle = new Map<string, { title: string; folders: string[] }>();
  for (const { folder, title } of entries) {
    if (isStretch(title) || !(folder in folderMuscle)) continue;
    const key = slugify(title);
    const existing = byTitle.get(key);
    if (existing) existing.folders.push(folder);
    else byTitle.set(key, { title: title.trim(), folders: [folder] });
  }

  return [...byTitle.entries()]
    .map(([sourceId, { title, folders }]) => {
      const sorted = [...new Set(folders)].sort(
        (a, b) => folderPriority.indexOf(a) - folderPriority.indexOf(b),
      );
      const folderMuscles = sorted.map((f) => folderMuscle[f]);
      const fromName = nameMuscle.find(([re]) => re.test(title))?.[1];
      const primaryMuscle = folderMuscles.includes('cardio')
        ? 'cardio'
        : (fromName ?? folderMuscles[0]);
      const secondaryMuscles = [...new Set(folderMuscles)].filter((m) => m !== primaryMuscle);
      const equipment = inferEquipment(title);
      const type = inferType(title, equipment, primaryMuscle);
      const bodyweightFactor: 0 | 1 =
        equipment === 'none' || type === 'bodyweight_assisted_reps' || type === 'bodyweight_reps'
          ? 1
          : 0;
      return {
        source: 'gym-gifs',
        sourceId,
        name: title,
        type,
        equipment,
        primaryMuscle,
        secondaryMuscles,
        bodyweightFactor,
        instructions: instructionsByName.get(normalizeName(title)) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

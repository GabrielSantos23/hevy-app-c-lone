import type { Equipment, ExerciseType, Muscle } from '@/db/schema';

import { inferEquipment, normalizeName } from '../exercises/gif-mapper';
import type { ImportedSet } from './csv';
import { hevyAliases } from './hevy-aliases';

type LibraryExercise = { id: string; name: string; equipment: Equipment };

const parenEquipment: Record<string, Equipment> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  kettlebell: 'kettlebell',
  cable: 'machine',
  machine: 'machine',
  'machine plates': 'machine',
  'smith machine': 'machine',
  'pec deck': 'machine',
  band: 'resistance_band',
  bodyweight: 'none',
  plate: 'plate',
  'suspension band': 'suspension',
};

const splitTitle = (title: string) => {
  const m = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { base: m[1], paren: m[2].toLowerCase() } : { base: title, paren: null };
};

export function buildMatcher(library: LibraryExercise[]) {
  const byName = new Map<string, LibraryExercise[]>();
  for (const e of library) {
    const key = normalizeName(e.name);
    byName.set(key, [...(byName.get(key) ?? []), e]);
  }
  return (title: string): string | null => {
    const { base, paren } = splitTitle(title);
    const equipment = paren ? parenEquipment[paren] : undefined;
    const pick = (name: string) => {
      const hits = byName.get(normalizeName(name)) ?? [];
      return hits.find((e) => e.equipment === equipment) ?? hits[0];
    };
    const exact = pick(hevyAliases[title] ?? title);
    if (exact) return exact.id;
    if (!paren) return null;
    for (const candidate of [`${paren} ${base}`, `${base} ${paren}`]) {
      const hit = pick(candidate);
      if (hit) return hit.id;
    }
    const stripped = (byName.get(normalizeName(base)) ?? []).find((e) => e.equipment === equipment);
    return equipment && stripped ? stripped.id : null;
  };
}

const muscleRules: [RegExp, Muscle][] = [
  [/treadmill|run(ning)?|bike|cycl|elliptical|rowing machine|stair|walk/i, 'cardio'],
  [/wrist/i, 'forearms'],
  [/calf/i, 'calves'],
  [/adduct/i, 'adductors'],
  [/abduct/i, 'abductors'],
  [/crunch|leg raise|sit.?up|plank|\babs?\b|knee raise/i, 'abdominals'],
  [/leg curl|deadlift|good morning|hamstring/i, 'hamstrings'],
  [/hip thrust|glute|kickback/i, 'glutes'],
  [/squat|leg press|leg extension|lunge/i, 'quadriceps'],
  [/tricep|pushdown|skullcrusher|dip/i, 'triceps'],
  [/curl/i, 'biceps'],
  [/pulldown|pull.?up|chin.?up|pullover/i, 'lats'],
  [/rear delt|face pull/i, 'shoulders'],
  [/row|reverse fly/i, 'upper_back'],
  [/shrug/i, 'traps'],
  [/shoulder|lateral raise|front raise|arnold|overhead press|military/i, 'shoulders'],
  [/bench|chest|fly|flye|pec|push.?up|butterfly|crossover/i, 'chest'],
];

export function inferCustom(title: string, sets: ImportedSet[]) {
  const { paren } = splitTitle(title);
  const equipment: Equipment =
    (paren && parenEquipment[paren]) || (paren === 'assisted' ? 'machine' : inferEquipment(title));
  const share = (pick: (s: ImportedSet) => unknown) =>
    sets.filter((s) => pick(s) !== null && pick(s) !== 0).length / Math.max(1, sets.length);
  const weighted = share((s) => s.weightKg) >= 0.5;
  const type: ExerciseType =
    share((s) => s.distanceM) >= 0.5
      ? 'distance_duration'
      : share((s) => s.reps) < 0.5 && share((s) => s.durationS) >= 0.5
        ? weighted
          ? 'weight_duration'
          : 'duration'
        : paren === 'assisted'
          ? 'bodyweight_assisted_reps'
          : weighted
            ? 'weight_reps'
            : 'reps_only';
  const primaryMuscle: Muscle = muscleRules.find(([re]) => re.test(title))?.[1] ?? 'other';
  return {
    type,
    equipment:
      type === 'reps_only' && !paren
        ? 'none'
        : weighted && equipment === 'none'
          ? 'other'
          : equipment,
    primaryMuscle,
    bodyweightFactor: type === 'reps_only' || type === 'bodyweight_assisted_reps' ? 1 : 0,
  };
}

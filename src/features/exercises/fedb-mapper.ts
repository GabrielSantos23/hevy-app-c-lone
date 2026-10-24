import type { Equipment, Muscle } from '@/db/schema';

import { inferType, normalizeName, type SeedExercise } from './gif-mapper.ts';

export type FedbEntry = {
  id: string;
  name: string;
  force: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
};

const equipmentMap: Record<string, Equipment> = {
  'body only': 'none',
  machine: 'machine',
  cable: 'machine',
  barbell: 'barbell',
  'e-z curl bar': 'barbell',
  dumbbell: 'dumbbell',
  kettlebells: 'kettlebell',
  bands: 'resistance_band',
};

const muscleMap: Record<string, Muscle> = {
  'middle back': 'upper_back',
  'lower back': 'lower_back',
};

const toMuscle = (m: string) => muscleMap[m] ?? (m as Muscle);

export function fromFedb(entries: FedbEntry[], existingNames: Set<string>): SeedExercise[] {
  return entries
    .filter(
      (e) =>
        e.images.length > 1 &&
        e.category !== 'stretching' &&
        !existingNames.has(normalizeName(e.name)),
    )
    .map((e) => {
      const equipment = e.equipment === null ? 'none' : (equipmentMap[e.equipment] ?? 'other');
      const primaryMuscle = e.category === 'cardio' ? 'cardio' : toMuscle(e.primaryMuscles[0]);
      const inferred = inferType(e.name, equipment, primaryMuscle);
      const type =
        e.force === 'static' && !inferred.includes('duration')
          ? equipment === 'none'
            ? 'duration'
            : 'weight_duration'
          : inferred;
      return {
        source: 'free-exercise-db',
        sourceId: e.id,
        name: e.name,
        type,
        equipment,
        primaryMuscle,
        secondaryMuscles: [...new Set(e.secondaryMuscles.map(toMuscle))].filter(
          (m) => m !== primaryMuscle,
        ),
        bodyweightFactor: equipment === 'none' || type.startsWith('bodyweight') ? 1 : 0,
        instructions: e.instructions.length ? e.instructions.join('\n') : null,
      };
    });
}

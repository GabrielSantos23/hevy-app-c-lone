import type { ExerciseType } from '@/db/schema';

export type SetField = 'weight' | 'reps' | 'duration' | 'distance' | 'shortDistance' | 'custom';

export const setFields: Record<ExerciseType, SetField[]> = {
  weight_reps: ['weight', 'reps'],
  reps_only: ['reps'],
  bodyweight_reps: ['weight', 'reps'],
  bodyweight_assisted_reps: ['weight', 'reps'],
  duration: ['duration'],
  weight_duration: ['weight', 'duration'],
  distance_duration: ['distance', 'duration'],
  short_distance_weight: ['weight', 'shortDistance'],
  floors_duration: ['custom', 'duration'],
  steps_duration: ['custom', 'duration'],
};

export type DraftField = 'weight' | 'reps' | 'duration' | 'distance' | 'custom';

export const draftField: Record<SetField, DraftField> = {
  weight: 'weight',
  reps: 'reps',
  duration: 'duration',
  distance: 'distance',
  shortDistance: 'distance',
  custom: 'custom',
};

export const isTimed = (type: ExerciseType) => setFields[type].includes('duration');

import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { type Equipment, exercise, type ExerciseType, type Muscle } from '@/db/schema';

export type ExerciseInput = {
  name: string;
  type: ExerciseType;
  equipment: Equipment;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
};

const bodyweightFactor = (type: ExerciseType) =>
  type === 'reps_only' || type === 'bodyweight_reps' || type === 'bodyweight_assisted_reps' ? 1 : 0;

const clean = (input: ExerciseInput) => ({
  ...input,
  name: input.name.trim(),
  secondaryMuscles: input.secondaryMuscles.filter((m) => m !== input.primaryMuscle),
  bodyweightFactor: bodyweightFactor(input.type),
});

export function createExercise(input: ExerciseInput): string {
  const id = randomUUID();
  db.insert(exercise)
    .values({ id, isCustom: true, ...clean(input) })
    .run();
  return id;
}

export function updateExercise(id: string, input: ExerciseInput) {
  db.update(exercise)
    .set({ ...clean(input), updatedAt: Date.now() })
    .where(and(eq(exercise.id, id), eq(exercise.isCustom, true)))
    .run();
}

export function deleteExercise(id: string) {
  db.update(exercise)
    .set({ deletedAt: sql`(cast(unixepoch('subsec') * 1000 as integer))`, updatedAt: Date.now() })
    .where(and(eq(exercise.id, id), eq(exercise.isCustom, true)))
    .run();
}

import { and, count, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { type Muscle, workout, workoutExercise } from '@/db/schema';

import { mediaFor } from './media';
import { exerciseListQuery, type ExerciseListItem } from './queries';
import { rankSuggestions } from './rank-suggestions';

export function suggestedExercises(
  muscles: Muscle[],
  exclude: string[],
  swaps: string[],
): ExerciseListItem[] {
  if (!muscles.length) return [];
  const candidates = exerciseListQuery({ search: '', muscle: null, equipment: null }).all();
  const usage = new Map(
    db
      .select({ id: workoutExercise.exerciseId, n: count() })
      .from(workoutExercise)
      .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
      .where(and(eq(workout.status, 'finished'), isNull(workout.deletedAt)))
      .groupBy(workoutExercise.exerciseId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  return rankSuggestions(candidates, {
    muscles: new Set(muscles),
    exclude: new Set(exclude),
    swaps,
    usage,
    hasMedia: (id) => mediaFor(id) !== undefined,
  });
}

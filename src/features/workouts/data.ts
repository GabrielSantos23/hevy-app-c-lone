import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { workout, workoutExercise, workoutSet } from '@/db/schema';
import type { DraftExercise } from '@/stores/exercise-draft';
import type { ActiveWorkout } from '@/stores/workout';

import { fromDraftSet, type SetValues, type UnitPrefs } from '../routines/convert';
import { loadDraft } from '../routines/data';

export type PreviousSets = Record<string, SetValues[]>;

export function previousSets(exerciseIds: string[], routineId: string | null): PreviousSets {
  if (!exerciseIds.length) return {};
  const entries = db
    .select({ id: workoutExercise.id, exerciseId: workoutExercise.exerciseId })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(
      and(
        inArray(workoutExercise.exerciseId, exerciseIds),
        eq(workout.status, 'finished'),
        isNull(workout.deletedAt),
        routineId ? eq(workout.routineId, routineId) : undefined,
      ),
    )
    .orderBy(desc(workout.startedAt), asc(workoutExercise.position))
    .all();
  const latest = new Map<string, string>();
  for (const e of entries) if (!latest.has(e.exerciseId)) latest.set(e.exerciseId, e.id);
  if (!latest.size) return {};
  const sets = db
    .select()
    .from(workoutSet)
    .where(inArray(workoutSet.workoutExerciseId, [...latest.values()]))
    .orderBy(asc(workoutSet.position))
    .all();
  const result: PreviousSets = {};
  for (const [exerciseId, entryId] of latest)
    result[exerciseId] = sets
      .filter((s) => s.workoutExerciseId === entryId)
      .map((s) => ({ ...s, repMin: null, repMax: null }));
  return result;
}

export function workoutFromRoutine(routineId: string, units: UnitPrefs): ActiveWorkout | null {
  const draft = loadDraft(routineId, units);
  if (!draft) return null;
  return {
    routineId,
    name: draft.name,
    notes: '',
    startedAt: Date.now(),
    exercises: draft.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) => (/-/.test(s.reps) ? { ...s, reps: '', repsHint: s.reps } : s)),
    })),
  };
}

export const hasDoneSets = (exercises: DraftExercise[]) =>
  exercises.some((e) => e.sets.some((s) => s.done));

export function finishWorkout(active: ActiveWorkout, units: UnitPrefs, endedAt: number): string {
  const id = randomUUID();
  db.transaction((tx) => {
    tx.insert(workout)
      .values({
        id,
        routineId: active.routineId,
        name: active.name.trim(),
        notes: active.notes.trim() || null,
        startedAt: active.startedAt,
        endedAt,
        status: 'finished',
      })
      .run();
    active.exercises
      .filter((e) => e.sets.some((s) => s.done))
      .forEach((e, position) => {
        const entryId = randomUUID();
        tx.insert(workoutExercise)
          .values({
            id: entryId,
            workoutId: id,
            exerciseId: e.exerciseId,
            position,
            supersetGroup: e.supersetGroup,
            restSeconds: e.restSeconds,
            notes: e.notes.trim() || null,
          })
          .run();
        tx.insert(workoutSet)
          .values(
            e.sets
              .filter((s) => s.done)
              .map((s, i) => {
                const { repMin, repMax, ...v } = fromDraftSet(
                  s,
                  units,
                  e.type === 'short_distance_weight',
                );
                return {
                  id: randomUUID(),
                  workoutExerciseId: entryId,
                  position: i,
                  ...v,
                  reps: v.reps ?? repMin ?? repMax,
                  completedAt: s.doneAt,
                };
              }),
          )
          .run();
      });
  });
  return id;
}

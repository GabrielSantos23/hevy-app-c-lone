import type { DraftExercise } from '@/stores/exercise-draft';
import type { ActiveWorkout } from '@/stores/workout';

import type { UnitPrefs } from '../routines/convert';
import { loadDraft, saveDraft } from '../routines/data';

// The workout that just finished, handed from the workout screen to the summary.
let lastFinished: { id: string; workout: ActiveWorkout } | null = null;
export const setFinished = (id: string, workout: ActiveWorkout) => {
  lastFinished = { id, workout };
};
export const finishedWorkout = (id: string) =>
  lastFinished?.id === id ? lastFinished.workout : null;
// Once asked about the routine, a remounted summary doesn't ask again.
export const clearFinished = () => {
  lastFinished = null;
};

export type RoutineChange = { kind: 'save' } | { kind: 'update'; name: string } | null;

const done = (e: DraftExercise) => e.sets.some((s) => s.done);

// A routine keeps the values as targets, not as done sets.
const asTemplate = (e: DraftExercise): DraftExercise => ({
  ...e,
  sets: e.sets.map(({ repsHint, ...s }) => ({
    ...s,
    reps: s.reps || repsHint || '',
    done: false,
    doneAt: null,
  })),
});

export const sameExercises = (a: { exerciseId: string }[], b: { exerciseId: string }[]) =>
  a.map((e) => e.exerciseId).join() === b.map((e) => e.exerciseId).join();

// An empty workout can become a routine; a routine workout with swapped or added exercises can update it.
export function routineChange(active: ActiveWorkout, units: UnitPrefs): RoutineChange {
  if (!active.routineId) return active.exercises.some(done) ? { kind: 'save' } : null;
  const draft = loadDraft(active.routineId, units);
  if (!draft || sameExercises(draft.exercises, active.exercises)) return null;
  return { kind: 'update', name: draft.name };
}

export function saveAsRoutine(active: ActiveWorkout, name: string, units: UnitPrefs) {
  return saveDraft(
    {
      routineId: null,
      folderId: null,
      name,
      notes: '',
      exercises: active.exercises.filter(done).map(asTemplate),
    },
    units,
  );
}

// Exercises the routine already had keep its targets; new ones take this workout's values.
export function updateRoutine(active: ActiveWorkout, units: UnitPrefs) {
  if (!active.routineId) return;
  const draft = loadDraft(active.routineId, units);
  if (!draft) return;
  const exercises = active.exercises.map(
    (e) => draft.exercises.find((r) => r.exerciseId === e.exerciseId) ?? asTemplate(e),
  );
  saveDraft({ ...draft, exercises }, units);
}

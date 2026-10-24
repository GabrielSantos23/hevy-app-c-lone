import type { DraftSet } from '@/stores/exercise-draft';
import { useWorkout } from '@/stores/workout';

import { draftField, setFields } from '../exercises/fields';
import { startRest } from './rest-timer';
import { completeSetPatch } from './stats';

export const setHints = (prev: DraftSet | null, set: DraftSet): Partial<DraftSet> => ({
  weight: prev?.weight,
  reps: set.repsHint || prev?.reps,
  duration: prev?.duration,
  distance: prev?.distance,
  custom: prev?.custom,
});

export function completeSet(entryKey: string, setKey: string, hints: Partial<DraftSet>) {
  const { workout, updateSet } = useWorkout.getState();
  const list = workout?.exercises ?? [];
  const index = list.findIndex((e) => e.key === entryKey);
  const entry = list[index];
  const set = entry?.sets.find((s) => s.key === setKey);
  if (!entry || !set || set.done) return false;
  const fields = [...new Set(setFields[entry.type].map((f) => draftField[f]))];
  const patch = completeSetPatch(set, hints, fields);
  if (!patch) return false;
  updateSet(entry.key, set.key, { ...patch, done: true, doneAt: Date.now() });
  const next = list[index + 1];
  const endOfRound = entry.supersetGroup === null || next?.supersetGroup !== entry.supersetGroup;
  const nextSet = entry.sets[entry.sets.indexOf(set) + 1];
  if (endOfRound && entry.restSeconds > 0 && nextSet?.setType !== 'dropset')
    startRest(entry.restSeconds);
  return true;
}

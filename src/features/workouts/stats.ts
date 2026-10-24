import type { ExerciseType, Muscle } from '@/db/schema';
import type { DraftExercise, DraftSet } from '@/stores/exercise-draft';

import type { DraftField } from '../exercises/fields';

import { fromDraftSet, type SetValues, type UnitPrefs } from '../routines/convert';

export function setVolume(
  type: ExerciseType,
  v: Pick<SetValues, 'weightKg' | 'reps' | 'distanceM'>,
  bodyweightFactor: number,
  bodyWeightKg: number | null,
) {
  const w = v.weightKg ?? 0;
  const reps = v.reps ?? 0;
  const bw = (bodyWeightKg ?? 0) * bodyweightFactor;
  switch (type) {
    case 'weight_reps':
      return w * reps;
    case 'reps_only':
      return bw * reps;
    case 'bodyweight_reps':
      return (w + bw) * reps;
    case 'bodyweight_assisted_reps':
      return bw ? Math.max((bw - w) * reps, 0) : 0;
    case 'short_distance_weight':
      return (v.distanceM ?? 0) * w;
    case 'weight_duration':
      return w;
    default:
      return 0;
  }
}

const counts = (s: DraftSet, countWarmups: boolean) =>
  s.done && (countWarmups || s.setType !== 'warmup');

export function workoutTotals(
  exercises: DraftExercise[],
  units: UnitPrefs,
  bodyWeightKg: number | null,
  countWarmups: boolean,
) {
  let volume = 0;
  let sets = 0;
  for (const e of exercises)
    for (const s of e.sets) {
      if (!counts(s, countWarmups)) continue;
      sets++;
      volume += setVolume(
        e.type,
        fromDraftSet(s, units, e.type === 'short_distance_weight'),
        e.bodyweightFactor,
        bodyWeightKg,
      );
    }
  return { volume, sets };
}

export function muscleSets(exercises: DraftExercise[], countWarmups: boolean) {
  const result: Partial<Record<Muscle, number>> = {};
  const add = (m: Muscle, n: number) => (result[m] = (result[m] ?? 0) + n);
  for (const e of exercises) {
    const done = e.sets.filter((s) => counts(s, countWarmups)).length;
    if (!done) continue;
    add(e.primaryMuscle, done);
    for (const m of e.secondaryMuscles) add(m, done * 0.5);
  }
  return result;
}

export function completeSetPatch(
  set: DraftSet,
  hints: Partial<Record<DraftField, string>>,
  fields: DraftField[],
): Partial<DraftSet> | null {
  const patch: Partial<DraftSet> = {};
  for (const f of fields) {
    if (set[f].trim()) continue;
    const hint = hints[f]?.trim();
    if (!hint) continue;
    patch[f] = f === 'reps' ? (hint.match(/\d+/)?.[0] ?? '') : hint;
  }
  const filled = fields.some((f) => (patch[f] ?? set[f]).trim() !== '');
  return filled ? patch : null;
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDurationWords(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${s % 60}s`;
  return `${s}s`;
}

export const formatClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

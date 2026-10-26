import type { DraftExercise, DraftSet } from '@/stores/exercise-draft';
import type { Preferences } from '@/stores/preferences';
import type { ActiveWorkout, Rest } from '@/stores/workout';

import { draftField, type SetField, setFields } from '../exercises/fields';

export type ActivityProps = {
  startedAt: number;
  title: string;
  detail: string;
  value: string;
  restStart: number | null;
  restEnd: number | null;
  canComplete: boolean;
  labels: { workout: string; rest: string; skip: string; complete: string };
};

type Context = {
  units: Pick<Preferences, 'weightUnit' | 'distanceUnit'>;
  exerciseName: (e: DraftExercise) => string;
  hints: (e: DraftExercise, index: number) => Partial<DraftSet>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function nextSet(workout: ActiveWorkout) {
  for (const entry of workout.exercises) {
    const index = entry.sets.findIndex((s) => !s.done);
    if (index >= 0) return { entry, index, set: entry.sets[index] };
  }
  return null;
}

export function setText(
  entry: DraftExercise,
  set: DraftSet,
  hints: Partial<DraftSet>,
  ctx: Context,
) {
  const unit: Partial<Record<SetField, string>> = {
    weight: ctx.units.weightUnit,
    distance: ctx.units.distanceUnit,
    shortDistance: 'm',
  };
  return setFields[entry.type]
    .map((f) => {
      const value = (set[draftField[f]] || hints[draftField[f]] || '').trim();
      if (!value) return '';
      if (f === 'reps') return ctx.t('activity.reps', { value });
      return unit[f] ? `${value} ${unit[f]}` : value;
    })
    .filter(Boolean)
    .join(' × ');
}

export function activityProps(
  workout: ActiveWorkout,
  rest: Rest | null,
  ctx: Context,
): ActivityProps {
  const { t } = ctx;
  const next = nextSet(workout);
  const resting = rest !== null && rest.endsAt > Date.now();
  const count = next ? { n: next.index + 1, total: next.entry.sets.length } : {};
  const value = next ? setText(next.entry, next.set, ctx.hints(next.entry, next.index), ctx) : '';
  return {
    startedAt: workout.startedAt,
    title: next ? ctx.exerciseName(next.entry) : workout.name,
    detail: !next
      ? t('activity.allDone')
      : resting
        ? `${t('activity.nextSet', count)}${value ? ` (${value})` : ''}`
        : t('activity.setOf', count),
    value: resting ? '' : value,
    restStart: resting ? rest.endsAt - rest.total * 1000 : null,
    restEnd: resting ? rest.endsAt : null,
    canComplete: next !== null && !resting && value !== '',
    labels: {
      workout: t('activity.workout'),
      rest: t('activity.rest'),
      skip: t('activity.skip'),
      complete: t('activity.complete'),
    },
  };
}

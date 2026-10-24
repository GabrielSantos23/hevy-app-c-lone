import type { ExerciseType, SetType } from '@/db/schema';

import { isTimed } from '../exercises/fields';

export type EstimateEntry = {
  type: ExerciseType;
  restSeconds: number | null;
  sets: { setType: SetType; durationS: number | null }[];
};

const SET_SECONDS = 45;

export function estimateSeconds(entries: EstimateEntry[], defaultRestSeconds: number) {
  return entries.reduce((total, e) => {
    const rest = e.restSeconds ?? defaultRestSeconds;
    return (
      total +
      e.sets.reduce(
        (sum, s) =>
          sum +
          (isTimed(e.type) && s.durationS ? s.durationS : SET_SECONDS) +
          (s.setType === 'dropset' ? 0 : rest),
        0,
      )
    );
  }, 0);
}

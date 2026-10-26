import type { SetType } from '@/db/schema';

export type HevySet = {
  type: string;
  weight_kg: number | null;
  reps: number | null;
  rep_range: { start: number | null; end: number | null } | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  custom_metric: number | null;
};
const setTypes: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];

export function hevySetValues(s: HevySet) {
  const range = s.rep_range;
  const ranged = range?.start != null && range.end != null && range.start !== range.end;
  return {
    setType: setTypes.includes(s.type as SetType) ? (s.type as SetType) : 'normal',
    weightKg: s.weight_kg,
    reps: ranged ? null : (s.reps ?? range?.start ?? null),
    repMin: ranged ? range.start : null,
    repMax: ranged ? range.end : null,
    durationS: s.duration_seconds,
    distanceM: s.distance_meters,
    customMetric: s.custom_metric,
  };
}

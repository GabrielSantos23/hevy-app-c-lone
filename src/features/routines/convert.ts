import type { SetType } from '@/db/schema';
import {
  formatDistanceKm,
  formatDuration,
  formatWeight,
  parseDistanceKm,
  parseDuration,
  parseNumber,
  parseWeight,
} from '@/lib/units';
import type { Preferences } from '@/stores/preferences';
import { type DraftSet, emptySet } from '@/stores/exercise-draft';

export type UnitPrefs = Pick<Preferences, 'weightUnit' | 'distanceUnit'>;

export type SetValues = {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  repMin: number | null;
  repMax: number | null;
  durationS: number | null;
  distanceM: number | null;
  customMetric: number | null;
  rpe: number | null;
};

const text = (n: number | null) => (n === null ? '' : String(n));

const int = (s: string) => {
  const n = parseNumber(s);
  return n === null ? null : Math.round(n);
};

export function toDraftSet(v: SetValues, units: UnitPrefs, shortDistance: boolean): DraftSet {
  const reps =
    v.repMin !== null && v.repMax !== null && v.repMin !== v.repMax
      ? `${v.repMin}-${v.repMax}`
      : text(v.reps ?? v.repMin);
  return {
    ...emptySet(),
    setType: v.setType,
    weight: formatWeight(v.weightKg, units.weightUnit),
    reps,
    duration: formatDuration(v.durationS),
    distance: shortDistance
      ? text(v.distanceM === null ? null : Math.round(v.distanceM))
      : formatDistanceKm(v.distanceM, units.distanceUnit),
    custom: text(v.customMetric),
    rpe: text(v.rpe),
  };
}

export function fromDraftSet(s: DraftSet, units: UnitPrefs, shortDistance: boolean): SetValues {
  const range = s.reps.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  const [lo, hi] = range ? [Number(range[1]), Number(range[2])].sort((a, b) => a - b) : [];
  return {
    setType: s.setType,
    weightKg: parseWeight(s.weight, units.weightUnit),
    reps: range ? null : int(s.reps),
    repMin: range ? lo : null,
    repMax: range ? hi : null,
    durationS: parseDuration(s.duration),
    distanceM: shortDistance
      ? parseNumber(s.distance)
      : parseDistanceKm(s.distance, units.distanceUnit),
    customMetric: int(s.custom),
    rpe: parseNumber(s.rpe),
  };
}

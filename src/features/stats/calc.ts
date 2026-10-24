import type { ExerciseType, RecordKind, SetType } from '@/db/schema';
import type { Preferences } from '@/stores/preferences';

export type OneRmFormula = Preferences['oneRmFormula'];

export function estimate1rm(weightKg: number, reps: number, formula: OneRmFormula) {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  if (formula === 'epley') return weightKg * (1 + reps / 30);
  if (reps <= 10) return (weightKg * 36) / (37 - reps);
  const pct = reps >= 30 ? 0.5 : 0.75 - ((reps - 10) * 0.25) / 20;
  return weightKg / pct;
}

export type HistorySet = {
  id: string;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
  customMetric: number | null;
};

export type Session = { workoutId: string; startedAt: number; sets: HistorySet[] };

const kindsByType: Record<ExerciseType, RecordKind[]> = {
  weight_reps: ['best_weight', 'best_1rm', 'best_volume'],
  reps_only: ['best_reps'],
  bodyweight_reps: ['best_weight', 'best_volume'],
  bodyweight_assisted_reps: ['best_reps'],
  duration: ['best_duration'],
  weight_duration: ['best_weight', 'best_duration'],
  distance_duration: ['best_distance', 'best_duration'],
  short_distance_weight: ['best_weight', 'best_distance'],
  floors_duration: ['most_floors', 'best_duration'],
  steps_duration: ['most_steps', 'best_duration'],
};

export const recordKindsFor = (type: ExerciseType) => kindsByType[type];

export function recordValue(kind: RecordKind, s: HistorySet, formula: OneRmFormula): number | null {
  const w = s.weightKg ?? 0;
  const reps = s.reps ?? 0;
  switch (kind) {
    case 'best_weight':
      return s.weightKg;
    case 'best_reps':
      return s.reps;
    case 'best_volume':
      return w * reps || null;
    case 'best_1rm':
      return estimate1rm(w, reps, formula) || null;
    case 'best_duration':
      return s.durationS;
    case 'best_distance':
      return s.distanceM;
    case 'most_floors':
    case 'most_steps':
      return s.customMetric;
  }
}

export type Best = { value: number; setId: string; at: number };

export function scanRecords(sessions: Session[], type: ExerciseType, formula: OneRmFormula) {
  const kinds = kindsByType[type];
  const bests: Partial<Record<RecordKind, Best>> = {};
  const prSetIds = new Set<string>();
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  ordered.forEach((session, index) => {
    for (const s of session.sets) {
      if (s.setType === 'warmup') continue;
      for (const kind of kinds) {
        const v = recordValue(kind, s, formula);
        if (v === null || v <= 0) continue;
        const best = bests[kind];
        if (best && v <= best.value) continue;
        if (index > 0) prSetIds.add(s.id);
        bests[kind] = { value: v, setId: s.id, at: session.startedAt };
      }
    }
  });
  return { bests, prSetIds };
}

export function sessionBest1rm(session: Session, formula: OneRmFormula) {
  return Math.max(
    0,
    ...session.sets
      .filter((s) => s.setType !== 'warmup')
      .map((s) => estimate1rm(s.weightKg ?? 0, s.reps ?? 0, formula)),
  );
}

export type WeekStart = Preferences['weekStart'];

export function startOfWeek(ms: number, weekStart: WeekStart) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() - (weekStart === 'monday' ? 1 : 0) + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

export type WeekBucket = {
  start: number;
  workouts: number;
  durationS: number;
  volume: number;
  reps: number;
};

export function weeklyBuckets(
  items: { startedAt: number; durationS: number; volume: number; reps: number }[],
  weeks: number,
  weekStart: WeekStart,
  now: number,
): WeekBucket[] {
  const current = startOfWeek(now, weekStart);
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * (weeks - 1 - i));
    return { start: d.getTime(), workouts: 0, durationS: 0, volume: 0, reps: 0 };
  });
  for (const item of items) {
    const start = startOfWeek(item.startedAt, weekStart);
    const bucket = buckets.find((b) => b.start === start);
    if (!bucket) continue;
    bucket.workouts++;
    bucket.durationS += item.durationS;
    bucket.volume += item.volume;
    bucket.reps += item.reps;
  }
  return buckets;
}

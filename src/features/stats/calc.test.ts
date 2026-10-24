import {
  estimate1rm,
  type HistorySet,
  scanRecords,
  sessionBest1rm,
  startOfWeek,
  weeklyBuckets,
} from './calc';

const set = (
  id: string,
  weightKg: number,
  reps: number,
  setType: HistorySet['setType'] = 'normal',
): HistorySet => ({
  id,
  setType,
  weightKg,
  reps,
  durationS: null,
  distanceM: null,
  customMetric: null,
});

describe('estimate1rm', () => {
  it('uses Brzycki up to 10 reps, then tapers to half the weight at 30', () => {
    expect(estimate1rm(100, 1, 'brzycki')).toBe(100);
    expect(estimate1rm(100, 5, 'brzycki')).toBeCloseTo(112.5, 1);
    expect(estimate1rm(100, 10, 'brzycki')).toBeCloseTo(133.3, 1);
    expect(estimate1rm(100, 20, 'brzycki')).toBeCloseTo(160, 1);
    expect(estimate1rm(100, 40, 'brzycki')).toBe(200);
  });

  it('supports Epley and ignores empty sets', () => {
    expect(estimate1rm(100, 10, 'epley')).toBeCloseTo(133.3, 1);
    expect(estimate1rm(0, 10, 'brzycki')).toBe(0);
    expect(estimate1rm(100, 0, 'brzycki')).toBe(0);
  });
});

describe('scanRecords', () => {
  const sessions = [
    { workoutId: 'w1', startedAt: 1, sets: [set('a', 60, 10), set('b', 70, 5)] },
    { workoutId: 'w2', startedAt: 2, sets: [set('c', 100, 1, 'warmup'), set('d', 75, 5)] },
    { workoutId: 'w3', startedAt: 3, sets: [set('e', 70, 5)] },
  ];

  it('tracks bests, skips warm-ups and flags PRs after the first session', () => {
    const { bests, prSetIds } = scanRecords(sessions, 'weight_reps', 'brzycki');
    expect(bests.best_weight).toMatchObject({ value: 75, setId: 'd', at: 2 });
    expect(bests.best_volume).toMatchObject({ value: 600, setId: 'a' });
    expect([...prSetIds]).toEqual(['d']);
  });

  it('finds the best estimated 1RM of a session', () => {
    expect(sessionBest1rm(sessions[1], 'brzycki')).toBeCloseTo(84.4, 1);
  });
});

describe('weeks', () => {
  it('starts weeks on the chosen day', () => {
    const wed = new Date(2026, 9, 21, 15).getTime();
    expect(new Date(startOfWeek(wed, 'monday')).getDate()).toBe(19);
    expect(new Date(startOfWeek(wed, 'sunday')).getDate()).toBe(18);
  });

  it('sums workouts into the last N weeks', () => {
    const now = new Date(2026, 9, 24).getTime();
    const buckets = weeklyBuckets(
      [
        { startedAt: new Date(2026, 9, 20).getTime(), durationS: 3600, volume: 1000, reps: 50 },
        { startedAt: new Date(2026, 9, 22).getTime(), durationS: 1800, volume: 500, reps: 20 },
        { startedAt: new Date(2026, 9, 13).getTime(), durationS: 600, volume: 100, reps: 10 },
        { startedAt: new Date(2025, 0, 1).getTime(), durationS: 600, volume: 100, reps: 10 },
      ],
      3,
      'monday',
      now,
    );
    expect(buckets.map((b) => [b.workouts, b.volume])).toEqual([
      [0, 0],
      [1, 100],
      [2, 1500],
    ]);
  });
});

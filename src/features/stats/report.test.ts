import type { WorkoutSummary } from './data';
import { workoutReport, workoutsInPeriod } from './report';

const set = (weightKg: number, reps: number, setType = 'normal') =>
  ({
    id: `${weightKg}-${reps}`,
    setType,
    weightKg,
    reps,
    durationS: null,
    distanceM: null,
    customMetric: null,
    rpe: null,
  }) as unknown as WorkoutSummary['exercises'][number]['sets'][number];

const workout = (startedAt: number): WorkoutSummary => ({
  id: String(startedAt),
  name: 'Push',
  notes: null,
  startedAt,
  durationS: 3600,
  volume: 1000,
  reps: 18,
  sets: 2,
  exercises: [
    {
      name: 'Bench Press',
      type: 'weight_reps',
      notes: null,
      sets: [set(40, 10, 'warmup'), set(60, 8)],
    } as unknown as WorkoutSummary['exercises'][number],
  ],
});

const text = {
  title: 'My workouts',
  date: () => 'Mon',
  duration: () => '1h',
  volume: (kg: number) => `${kg} kg`,
  exerciseName: (e: { name: string }) => e.name,
  setLabel: () => 'W',
};

describe('workoutReport', () => {
  it('lists each workout with its sets', () => {
    const report = workoutReport([workout(0)], { weightUnit: 'kg', distanceUnit: 'km' }, text);
    expect(report).toContain('## Push · Mon · 1h · 1000 kg');
    expect(report).toContain('- Bench Press: W 40 kg × 10, 60 kg × 8');
  });

  it('keeps only workouts inside the period', () => {
    const day = 86_400_000;
    const now = 40 * day;
    const list = [workout(now - 3 * day), workout(now - 20 * day)];
    expect(workoutsInPeriod(list, 'week', now)).toHaveLength(1);
    expect(workoutsInPeriod(list, 'month', now)).toHaveLength(2);
  });
});

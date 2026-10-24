import type { DraftExercise, DraftSet } from '@/stores/exercise-draft';
import type { ActiveWorkout } from '@/stores/workout';

import { activityProps, nextSet } from './activity';
import { monthGrid, streakWeeks, volumeByDay, widgetProps, widgetTimeline } from './data';

const at = (d: string) => new Date(d).getTime();
const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key);

describe('widget data', () => {
  const now = at('2026-10-24T15:00:00');

  it('counts week streaks, allowing the current week to be empty', () => {
    const starts = ['2026-10-20T10:00', '2026-10-14T10:00', '2026-10-06T10:00', '2026-09-22T10:00'];
    expect(streakWeeks(starts.map(at), now, 'monday')).toBe(3);
    expect(streakWeeks(starts.slice(1).map(at), now, 'monday')).toBe(2);
    expect(streakWeeks([], now, 'monday')).toBe(0);
  });

  it('lays out the month by week start', () => {
    const monday = monthGrid(now, 'monday');
    expect(monday[0]).toEqual([0, 0, 0, 1, 2, 3, 4]);
    expect(monday.at(-1)).toEqual([26, 27, 28, 29, 30, 31, 0]);
    expect(monthGrid(now, 'sunday')[0]).toEqual([0, 0, 0, 0, 1, 2, 3]);
  });

  it('sums volume per day for the last 7 days', () => {
    const workouts = [
      { startedAt: at('2026-10-24T08:00'), volume: 100 },
      { startedAt: at('2026-10-24T18:00'), volume: 50 },
      { startedAt: at('2026-10-18T09:00'), volume: 70 },
      { startedAt: at('2026-10-17T09:00'), volume: 999 },
    ];
    expect(volumeByDay(workouts, now)).toEqual([70, 0, 0, 0, 0, 0, 150]);
  });

  it('builds props and a daily timeline', () => {
    const input = {
      workouts: [{ startedAt: at('2026-10-23T08:00'), volume: 12_345 }],
      routines: [{ id: 'r 1', name: 'Push' }],
      weekStart: 'monday' as const,
      weightUnit: 'kg' as const,
      locale: 'en',
      t,
    };
    const props = widgetProps(input, now);
    expect(props.volume.value).toBe('12.3k kg');
    expect(props.week.days.map((d) => d.done)).toEqual([false, false, false, false, false, true, false]);
    expect(props.calendar.done).toEqual([23]);
    expect(props.start.routines[0].url).toBe('repforge://train?start=r%201');
    const timeline = widgetTimeline(input, now);
    expect(timeline).toHaveLength(7);
    expect(timeline[1].date.getHours()).toBe(0);
    expect(timeline[1].props.week.days.at(-1)?.today).toBe(true);
  });
});

describe('live activity props', () => {
  const set = (over: Partial<DraftSet>): DraftSet => ({
    key: Math.random().toString(),
    setType: 'normal',
    weight: '',
    reps: '',
    duration: '',
    distance: '',
    custom: '',
    rpe: '',
    done: false,
    doneAt: null,
    ...over,
  });
  const entry: DraftExercise = {
    key: 'e1',
    exerciseId: 'bench',
    name: 'Bench Press',
    namePt: 'Supino',
    type: 'weight_reps',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    bodyweightFactor: 0,
    restSeconds: 90,
    supersetGroup: null,
    notes: '',
    sets: [set({ weight: '40', reps: '5', done: true }), set({ repsHint: '3-5' }), set({})],
  };
  const workout: ActiveWorkout = {
    routineId: null,
    name: 'Push',
    notes: '',
    startedAt: 1000,
    exercises: [entry],
  };
  const ctx = {
    units: { weightUnit: 'kg' as const, distanceUnit: 'km' as const },
    exerciseName: (e: DraftExercise) => e.name,
    hints: (e: DraftExercise, i: number) => ({ weight: '60', reps: e.sets[i].repsHint || '8' }),
    t,
  };

  it('shows the next undone set with hinted values', () => {
    expect(nextSet(workout)?.index).toBe(1);
    const props = activityProps(workout, null, ctx);
    expect(props.title).toBe('Bench Press');
    expect(props.detail).toBe('activity.setOf:{"n":2,"total":3}');
    expect(props.value).toBe('60 kg × activity.reps:{"value":"3-5"}');
    expect(props.canComplete).toBe(true);
    expect(props.restEnd).toBeNull();
  });

  it('switches to the rest timer while resting', () => {
    const endsAt = Date.now() + 60_000;
    const props = activityProps(workout, { endsAt, total: 90, notificationId: null }, ctx);
    expect(props.restEnd).toBe(endsAt);
    expect(props.restStart).toBe(endsAt - 90_000);
    expect(props.detail).toContain('activity.nextSet');
    expect(props.value).toBe('');
    expect(props.canComplete).toBe(false);
  });

  it('reports when every set is done', () => {
    const done = { ...workout, exercises: [{ ...entry, sets: [set({ done: true })] }] };
    expect(activityProps(done, null, ctx)).toMatchObject({ detail: 'activity.allDone', title: 'Push' });
  });
});

import { type DraftExercise, type DraftSet, emptySet } from '@/stores/exercise-draft';

import {
  completeSetPatch,
  formatClock,
  formatDurationWords,
  formatElapsed,
  muscleSets,
  setVolume,
  workoutTotals,
} from './stats';

const kg = { weightUnit: 'kg', distanceUnit: 'km' } as const;

const set = (patch: Partial<DraftSet>): DraftSet => ({ ...emptySet(), ...patch });

const exercise = (patch: Partial<DraftExercise>): DraftExercise => ({
  key: 'e',
  exerciseId: 'x',
  name: 'x',
  namePt: null,
  type: 'weight_reps',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  bodyweightFactor: 0,
  restSeconds: 90,
  supersetGroup: null,
  notes: '',
  sets: [],
  ...patch,
});

describe('setVolume', () => {
  it('follows the per-type formulas', () => {
    const v = { weightKg: 20, reps: 10, distanceM: 40 };
    expect(setVolume('weight_reps', v, 0, 80)).toBe(200);
    expect(setVolume('reps_only', v, 1, 80)).toBe(800);
    expect(setVolume('reps_only', v, 1, null)).toBe(0);
    expect(setVolume('bodyweight_reps', v, 1, 80)).toBe(1000);
    expect(setVolume('bodyweight_assisted_reps', v, 1, 80)).toBe(600);
    expect(setVolume('bodyweight_assisted_reps', { ...v, weightKg: 100 }, 1, 80)).toBe(0);
    expect(setVolume('short_distance_weight', v, 0, 80)).toBe(800);
    expect(setVolume('duration', v, 0, 80)).toBe(0);
  });
});

describe('workout totals', () => {
  const list = [
    exercise({
      sets: [
        set({ setType: 'warmup', weight: '40', reps: '10', done: true }),
        set({ weight: '60', reps: '8', done: true }),
        set({ weight: '60', reps: '8' }),
      ],
    }),
  ];

  it('counts only completed sets and skips warm-ups unless asked', () => {
    expect(workoutTotals(list, kg, null, false)).toEqual({ volume: 480, sets: 1 });
    expect(workoutTotals(list, kg, null, true)).toEqual({ volume: 880, sets: 2 });
  });

  it('gives 1 per set to the primary muscle and 0.5 to secondaries', () => {
    expect(muscleSets(list, false)).toEqual({ chest: 1, triceps: 0.5, shoulders: 0.5 });
  });
});

describe('completeSetPatch', () => {
  it('fills empty fields from hints and keeps typed values', () => {
    expect(
      completeSetPatch(set({ weight: '70' }), { weight: '60', reps: '8-12' }, ['weight', 'reps']),
    ).toEqual({ reps: '8' });
  });

  it('refuses a set with nothing to log', () => {
    expect(completeSetPatch(set({}), {}, ['weight', 'reps'])).toBeNull();
  });
});

it('formats elapsed time with hours only when needed', () => {
  expect(formatElapsed(65_000)).toBe('1:05');
  expect(formatElapsed(3_725_000)).toBe('1:02:05');
});

it('formats durations the way the logging screen shows them', () => {
  expect(formatDurationWords(6)).toBe('6s');
  expect(formatDurationWords(220)).toBe('3min 40s');
  expect(formatDurationWords(120)).toBe('2min 0s');
  expect(formatDurationWords(3720)).toBe('1h 2min');
  expect(formatClock(119)).toBe('01:59');
});

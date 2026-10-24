import {
  formatDuration,
  formatLength,
  formatWeight,
  parseDuration,
  parseLength,
  parseWeight,
} from '@/lib/units';
import { type DraftExercise, emptySet, normalizeSupersets } from '@/stores/exercise-draft';
import { useRoutineDraft } from '@/stores/routine-draft';

import { fromDraftSet, toDraftSet } from './convert';
import { estimateSeconds } from './estimate';

const kg = { weightUnit: 'kg', distanceUnit: 'km' } as const;
const lb = { weightUnit: 'lb', distanceUnit: 'mi' } as const;

describe('units', () => {
  it('round-trips weight in kg and lb', () => {
    expect(formatWeight(100, 'kg')).toBe('100');
    expect(formatWeight(100, 'lb')).toBe('220.5');
    expect(parseWeight('225', 'lb')).toBeCloseTo(102.06, 2);
    expect(parseWeight('82,5', 'kg')).toBe(82.5);
    expect(parseWeight('', 'kg')).toBeNull();
    expect(parseWeight('-3', 'kg')).toBeNull();
  });

  it('converts lengths between cm and inches', () => {
    expect(formatLength(40.64, 'in')).toBe('16');
    expect(parseLength('16', 'in')).toBeCloseTo(40.64, 2);
    expect(formatLength(null, 'cm')).toBe('');
  });

  it('parses m:ss and plain seconds', () => {
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('45')).toBe(45);
    expect(parseDuration('a:10')).toBeNull();
    expect(formatDuration(605)).toBe('10:05');
  });
});

describe('set conversion', () => {
  const base = {
    setType: 'normal' as const,
    weightKg: null,
    reps: null,
    repMin: null,
    repMax: null,
    durationS: null,
    distanceM: null,
    customMetric: null,
    rpe: null,
  };

  it('keeps rep ranges and weights through a round trip', () => {
    const draft = toDraftSet({ ...base, weightKg: 60, repMin: 8, repMax: 12 }, kg, false);
    expect(draft).toMatchObject({ weight: '60', reps: '8-12' });
    expect(fromDraftSet(draft, kg, false)).toMatchObject({
      weightKg: 60,
      reps: null,
      repMin: 8,
      repMax: 12,
    });
  });

  it('orders a reversed range and converts miles', () => {
    const out = fromDraftSet(
      { ...emptySet(), reps: '12 - 8', distance: '1', duration: '8:00' },
      lb,
      false,
    );
    expect(out).toMatchObject({ repMin: 8, repMax: 12, durationS: 480 });
    expect(out.distanceM).toBeCloseTo(1609.34, 1);
  });

  it('keeps short distances in meters', () => {
    expect(fromDraftSet({ ...emptySet(), distance: '40' }, lb, true).distanceM).toBe(40);
    expect(toDraftSet({ ...base, distanceM: 40 }, kg, true).distance).toBe('40');
  });
});

describe('estimateSeconds', () => {
  it('adds 45 s per set plus rest, skipping rest after drop sets', () => {
    const seconds = estimateSeconds(
      [
        {
          type: 'weight_reps',
          restSeconds: 120,
          sets: [
            { setType: 'normal', durationS: null },
            { setType: 'dropset', durationS: null },
          ],
        },
        { type: 'duration', restSeconds: null, sets: [{ setType: 'normal', durationS: 60 }] },
      ],
      90,
    );
    expect(seconds).toBe(45 + 120 + 45 + 60 + 90);
  });
});

const exercise = (key: string, supersetGroup: number | null = null): DraftExercise => ({
  key,
  exerciseId: key,
  name: key,
  namePt: null,
  type: 'weight_reps',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  bodyweightFactor: 0,
  restSeconds: 90,
  supersetGroup,
  notes: '',
  sets: [emptySet()],
});

describe('routine draft', () => {
  const store = useRoutineDraft;
  const start = (exercises: DraftExercise[]) =>
    store.getState().start({ routineId: null, folderId: null, name: '', notes: '', exercises });
  const groups = () => store.getState().draft!.exercises.map((e) => e.supersetGroup);

  it('keeps only adjacent runs as supersets and renumbers them', () => {
    expect(
      normalizeSupersets([
        exercise('a', 4),
        exercise('b', 4),
        exercise('c', 7),
        exercise('d', 4),
        exercise('e', 4),
      ]).map((e) => e.supersetGroup),
    ).toEqual([1, 1, null, 2, 2]);
  });

  it('links with the next exercise and joins its existing superset', () => {
    start([exercise('a'), exercise('b'), exercise('c')]);
    store.getState().toggleSuperset('b');
    expect(groups()).toEqual([null, 1, 1]);
    store.getState().toggleSuperset('a');
    expect(groups()).toEqual([1, 1, 1]);
    store.getState().toggleSuperset('b');
    expect(groups()).toEqual([null, null, null]);
    expect(store.getState().dirty).toBe(true);
  });

  it('leaves the superset when moved past a non-member', () => {
    start([exercise('a', 1), exercise('b', 1), exercise('c')]);
    store.getState().moveExercise('b', 1);
    expect(store.getState().draft!.exercises.map((e) => e.key)).toEqual(['a', 'c', 'b']);
    expect(groups()).toEqual([null, null, null]);
  });

  it('copies the last set when adding one and cycles set types', () => {
    start([exercise('a')]);
    const setKey = store.getState().draft!.exercises[0].sets[0].key;
    store.getState().updateSet('a', setKey, { weight: '50', reps: '10' });
    store.getState().cycleSetType('a', setKey);
    store.getState().addSet('a');
    const sets = store.getState().draft!.exercises[0].sets;
    expect(sets.map((s) => [s.setType, s.weight, s.reps])).toEqual([
      ['warmup', '50', '10'],
      ['normal', '50', '10'],
    ]);
    expect(sets[0].key).not.toBe(sets[1].key);
  });
});

import { autoMatch, candidates, coverage, type HealthWorkout } from './match';

const min = 60_000;
const t0 = new Date('2026-10-24T10:00:00').getTime();
const hk = (uuid: string, startMin: number, endMin: number): HealthWorkout => ({
  uuid,
  start: t0 + startMin * min,
  end: t0 + endMin * min,
  activityType: 'traditionalStrengthTraining',
  source: 'Apple Watch',
});
const session = (id: string, startMin: number, endMin: number) => ({
  id,
  start: t0 + startMin * min,
  end: t0 + endMin * min,
});

describe('coverage', () => {
  it('measures overlap against the shorter workout', () => {
    expect(coverage(session('a', 0, 60), hk('h', 30, 90))).toBe(0.5);
    expect(coverage(session('a', 0, 60), hk('h', 10, 20))).toBe(1);
    expect(coverage(session('a', 0, 60), hk('h', 60, 90))).toBe(0);
  });
});

describe('autoMatch', () => {
  it('links a single overlapping Watch workout', () => {
    const r = autoMatch([session('a', 0, 60)], [hk('h1', -2, 58), hk('far', 300, 360)], new Set());
    expect(r.links).toEqual([{ workoutId: 'a', uuid: 'h1' }]);
    expect(r.ambiguous).toEqual([]);
  });

  it('leaves workouts with no or too little overlap unlinked', () => {
    const r = autoMatch([session('a', 0, 60)], [hk('h1', 50, 120)], new Set());
    expect(r).toEqual({ links: [], ambiguous: [] });
  });

  it('flags multiple matches instead of guessing', () => {
    const r = autoMatch([session('a', 0, 90)], [hk('h1', 0, 40), hk('h2', 45, 90)], new Set());
    expect(r.links).toEqual([]);
    expect(r.ambiguous).toEqual([{ workoutId: 'a', uuids: ['h1', 'h2'] }]);
  });

  it('flags one Health workout that covers two app workouts', () => {
    const r = autoMatch([session('a', 0, 30), session('b', 35, 60)], [hk('h1', 0, 60)], new Set());
    expect(r.links).toEqual([]);
    expect(r.ambiguous.map((a) => a.workoutId)).toEqual(['a', 'b']);
  });

  it('skips dismissed, already linked and self-exported Health workouts', () => {
    const r = autoMatch(
      [session('a', 0, 60)],
      [hk('dismissed', 0, 60), hk('h1', 5, 55)],
      new Set(['dismissed']),
    );
    expect(r.links).toEqual([{ workoutId: 'a', uuid: 'h1' }]);
  });
});

describe('candidates', () => {
  it('lists nearby workouts for manual linking, best overlap first', () => {
    const list = candidates(
      session('a', 0, 60),
      [
        hk('later', 120, 150),
        hk('overlap', 30, 90),
        hk('taken', 0, 60),
        hk('tomorrow', 24 * 60, 25 * 60),
      ],
      new Set(['taken']),
    );
    expect(list.map((c) => c.uuid)).toEqual(['overlap', 'later']);
    expect(list[1].distance).toBe(60 * min);
  });
});

import { pickFacts } from './summary-facts';

const input = {
  volumeKg: 5000,
  heaviestKg: 100,
  durationS: 3600,
  topMuscle: { muscle: 'chest' as const, sets: 9 },
};

describe('pickFacts', () => {
  it('picks different kinds, never more than asked', () => {
    const facts = pickFacts(input, [], 3, () => 0.5);
    expect(facts).toHaveLength(3);
    expect(new Set(facts.map((f) => f.kind)).size).toBe(3);
  });

  it('only compares with things the workout actually beats', () => {
    const facts = pickFacts(input, [], 4, () => 0);
    const volume = facts.find((f) => f.kind === 'volume');
    expect(volume?.kind === 'volume' && 5000 / volume.times).toBeGreaterThan(0);
    for (const f of facts) if ('times' in f) expect(f.times).toBeGreaterThanOrEqual(1);
  });

  it('avoids comparisons shown last time when there are others', () => {
    const recent = ['volume:dog', 'volume:washingMachine', 'volume:motorcycle', 'volume:piano'];
    for (let i = 0; i < 10; i++) {
      const v = pickFacts(input, recent, 4, () => i / 10).find((f) => f.kind === 'volume');
      expect(recent).not.toContain(v?.id);
    }
  });

  it('never compares two cards with the same object', () => {
    for (let i = 0; i < 10; i++) {
      const objects = pickFacts(input, [], 4, () => i / 10).flatMap((f) =>
        'object' in f ? [f.object] : [],
      );
      expect(new Set(objects).size).toBe(objects.length);
    }
  });

  it('skips kinds with nothing to compare', () => {
    const facts = pickFacts({ volumeKg: 0, heaviestKg: 0, durationS: 60, topMuscle: null }, []);
    expect(facts).toEqual([]);
  });
});

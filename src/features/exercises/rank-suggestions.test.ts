import { rankSuggestions } from './rank-suggestions';

const ex = (id: string, primaryMuscle: 'quadriceps' | 'chest' = 'quadriceps') => ({
  id,
  name: id,
  primaryMuscle,
});

describe('rankSuggestions', () => {
  const candidates = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((id) => ex(id));
  const base = {
    muscles: new Set(['quadriceps'] as const),
    exclude: new Set<string>(),
    swaps: [] as string[],
    usage: new Map<string, number>(),
    hasMedia: () => false,
  };

  it('keeps only the workout muscles, skips exercises already in it, and caps at 7', () => {
    const r = rankSuggestions([...candidates, ex('bench', 'chest')], {
      ...base,
      exclude: new Set(['a']),
    });
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('puts recent swaps first, then the most used, then those with a demo', () => {
    const r = rankSuggestions(candidates, {
      ...base,
      swaps: ['i', 'h'],
      usage: new Map([['g', 3]]),
      hasMedia: (id) => id === 'f',
    });
    expect(r.slice(0, 4).map((x) => x.id)).toEqual(['i', 'h', 'g', 'f']);
  });
});

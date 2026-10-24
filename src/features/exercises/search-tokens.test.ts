import { searchTokens } from './queries';

jest.mock('@/db/client', () => ({ db: {} }));

describe('searchTokens', () => {
  it('splits words, lowercases and strips accents', () => {
    expect(searchTokens('  Supino  INCLINADO com Halteres ')).toEqual([
      'supino',
      'inclinado',
      'com',
      'halteres',
    ]);
    expect(searchTokens('Elevação')).toEqual(['elevacao']);
  });

  it('removes LIKE wildcards', () => {
    expect(searchTokens('100%_curl')).toEqual(['100', 'curl']);
    expect(searchTokens('')).toEqual([]);
  });
});

import { heartSummary } from './health';

jest.mock('../../../modules/health-probe', () => ({ healthProbe: null }));

describe('heartSummary', () => {
  it('returns null without samples', () => {
    expect(heartSummary([])).toBeNull();
  });

  it('averages, finds min and max, and buckets over time', () => {
    const points: [number, number][] = [
      [0, 100],
      [1000, 120],
      [2000, 140],
      [3000, 80],
    ];
    const s = heartSummary(points, 2);
    expect(s).toEqual({ avg: 110, min: 80, max: 140, buckets: [110, 110] });
  });

  it('leaves empty buckets at 0', () => {
    const s = heartSummary(
      [
        [0, 90],
        [10_000, 150],
      ],
      4,
    );
    expect(s?.buckets).toEqual([90, 0, 0, 150]);
  });
});

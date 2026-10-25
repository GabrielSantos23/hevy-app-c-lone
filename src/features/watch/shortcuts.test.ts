import { localStamp, parseNumberText, parseWatchResult } from './shortcuts';

jest.mock('react-native', () => ({ Linking: { openURL: jest.fn() }, Platform: { OS: 'ios' } }));
jest.mock('@/stores/preferences', () => ({ usePreferences: { getState: () => ({}) } }));

describe('watch shortcut result', () => {
  it('reads calories and heart rate in English format', () => {
    expect(parseWatchResult('kcal=312.46;hr=88 102 131 140')).toEqual({
      kcal: 312.46,
      hr: [88, 102, 131, 140],
    });
  });

  it('reads Portuguese decimals and thousands separators', () => {
    expect(parseWatchResult('kcal=1.204,5;hr=90 95,5')).toEqual({ kcal: 1204.5, hr: [90, 95.5] });
    expect(parseNumberText('1,204.5')).toBe(1204.5);
    expect(parseNumberText('312,46 kcal')).toBe(312.46);
  });

  it('sends the workout start as a plain local date and time', () => {
    const ms = new Date(2026, 9, 25, 19, 5, 9).getTime();
    expect(localStamp(ms)).toBe('2026-10-25 19:05:09');
  });

  it('copes with missing values and line breaks', () => {
    expect(parseWatchResult('kcal=;hr=')).toEqual({ kcal: null, hr: [] });
    expect(parseWatchResult('hr=70\n75\n80')).toEqual({ kcal: null, hr: [70, 75, 80] });
  });
});

import { Linking, Platform } from 'react-native';

import { usePreferences } from '@/stores/preferences';

export const START_SHORTCUT = 'Repforge Start';
export const FINISH_SHORTCUT = 'Repforge Finish';

export type WatchData = { kcal: number | null; hr: number[] };

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

const run = (name: string, params: Record<string, string>) =>
  Linking.openURL(`shortcuts://x-callback-url/run-shortcut?${query({ name, ...params })}`).catch(
    () => {},
  );

const enabled = () => Platform.OS === 'ios' && usePreferences.getState().watchShortcuts;

export function startWatchWorkout() {
  if (!enabled()) return;
  run(START_SHORTCUT, { 'x-success': 'repforge://workout', 'x-error': 'repforge://workout' });
}

const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');

export function localIso(ms: number) {
  const d = new Date(ms);
  const offset = -d.getTimezoneOffset();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${offset >= 0 ? '+' : '-'}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

export function finishWatchWorkout(workoutId: string, startedAt: number) {
  if (!enabled()) return;
  run(FINISH_SHORTCUT, {
    input: 'text',
    text: localIso(startedAt),
    'x-success': `repforge://watch-data?workout=${workoutId}`,
    'x-error': `repforge://history/${workoutId}`,
  });
}

export function parseNumberText(text: string): number | null {
  let s = text.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (s.includes('.') && s.includes(',')) {
    s = s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1);
  } else {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseWatchResult(text: string): WatchData {
  const field = (key: string) => new RegExp(`${key}\\s*=\\s*([^;]*)`, 'i').exec(text)?.[1] ?? '';
  return {
    kcal: parseNumberText(field('kcal')),
    hr: field('hr')
      .split(/\s+/)
      .map(parseNumberText)
      .filter((n): n is number => n !== null && n > 0),
  };
}

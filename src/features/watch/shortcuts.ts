import { Linking, Platform } from 'react-native';

import { usePreferences } from '@/stores/preferences';

export const START_SHORTCUT = 'Repforge Start';
export const STOP_SHORTCUT = 'Repforge Stop';

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

const run = (name: string, params: Record<string, string>) =>
  Linking.openURL(`shortcuts://x-callback-url/run-shortcut?${query({ name, ...params })}`).catch(
    () => {},
  );

export const enabled = () => Platform.OS === 'ios' && usePreferences.getState().watchShortcuts;

export function startWatchWorkout() {
  if (!enabled()) return;
  run(START_SHORTCUT, { 'x-success': 'repforge://workout', 'x-error': 'repforge://workout' });
}

export function stopWatchWorkout() {
  if (!enabled()) return;
  run(STOP_SHORTCUT, { 'x-success': 'repforge://', 'x-error': 'repforge://' });
}

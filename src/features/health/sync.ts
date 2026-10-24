import { AppState } from 'react-native';

import { usePreferences } from '@/stores/preferences';

import { excludedUuids, linkWorkout, sessionFor, setExported, unlinkedSessions } from './data';
import {
  fetchHealthDetails,
  fetchHealthWorkouts,
  healthSupported,
  saveHealthWorkout,
  watchHealthWorkouts,
} from './healthkit';
import { autoMatch, NEARBY_MS } from './match';

const LOOKBACK_MS = 30 * 86_400_000;

export type SyncResult = { linked: number; ambiguous: number };

let running: Promise<SyncResult | null> | null = null;

async function run(): Promise<SyncResult | null> {
  if (!usePreferences.getState().healthSync || !healthSupported()) return null;
  const since = Date.now() - LOOKBACK_MS;
  const sessions = unlinkedSessions(since);
  if (!sessions.length) return { linked: 0, ambiguous: 0 };
  const health = await fetchHealthWorkouts(since - NEARBY_MS, Date.now());
  const { links, ambiguous } = autoMatch(sessions, health, excludedUuids());
  for (const link of links) {
    const h = health.find((w) => w.uuid === link.uuid);
    if (!h) continue;
    const details = await fetchHealthDetails(h.uuid).catch(() => null);
    linkWorkout(link.workoutId, h, details, 'auto');
  }
  return { linked: links.length, ambiguous: ambiguous.length };
}

export function syncHealth() {
  running ??= run()
    .catch(() => null)
    .finally(() => {
      running = null;
    });
  return running;
}

export async function exportToHealth(workoutId: string) {
  if (!usePreferences.getState().healthWrite || !healthSupported()) return;
  const session = sessionFor(workoutId);
  if (!session) return;
  const uuid = await saveHealthWorkout(session).catch(() => null);
  if (uuid) setExported(workoutId, uuid);
}

let stopWatching: (() => void) | null = null;

function updateWatch() {
  const enabled = usePreferences.getState().healthSync && healthSupported();
  if (enabled && !stopWatching) {
    stopWatching = watchHealthWorkouts(() => syncHealth());
    syncHealth();
  } else if (!enabled && stopWatching) {
    stopWatching();
    stopWatching = null;
  }
}

let started = false;

export function startHealthSync() {
  if (started) return;
  started = true;
  updateWatch();
  usePreferences.subscribe((s, prev) => {
    if (s.healthSync !== prev.healthSync) updateWatch();
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') syncHealth();
  });
}

import { useWorkout } from '@/stores/workout';

import { latestFinishedWorkout } from './data';
import { enabled, fetchWatchData } from './shortcuts';

const MAX_GAP_MS = 3 * 60 * 60_000;

// shortcut: kept in memory, so it is lost if iOS closes Repforge before the workout is finished
let waitingForRepforge = false;

export function watchWorkoutEnded() {
  if (!enabled()) return;
  if (useWorkout.getState().workout) {
    waitingForRepforge = true;
    return;
  }
  const w = latestFinishedWorkout();
  if (w && Date.now() - (w.endedAt ?? w.startedAt) < MAX_GAP_MS) fetchWatchData(w.id, w.startedAt);
}

export function repforgeWorkoutFinished(workoutId: string, startedAt: number) {
  if (!waitingForRepforge || !enabled()) return;
  waitingForRepforge = false;
  fetchWatchData(workoutId, startedAt);
}

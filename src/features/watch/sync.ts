import { useWorkout } from '@/stores/workout';

import { latestFinishedWorkout } from './data';
import { enabled, fetchWatchData, stopWatchWorkout } from './shortcuts';

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

// Finished in Repforge first: end the Watch workout, and its automation then fetches the data.
export function repforgeWorkoutFinished(workoutId: string, startedAt: number) {
  if (!enabled()) return;
  if (!waitingForRepforge) return stopWatchWorkout();
  waitingForRepforge = false;
  fetchWatchData(workoutId, startedAt);
}

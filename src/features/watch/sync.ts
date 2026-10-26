import { enabled, stopWatchWorkout } from './shortcuts';

// shortcut: kept in memory, so it is lost if iOS closes Repforge in between
let watchEnded = false;

// The Watch workout ended first (its automation opened repforge://watch-sync).
export function watchWorkoutEnded() {
  watchEnded = true;
}

// Finished in Repforge: end the Watch workout too, unless it already ended.
export function repforgeWorkoutFinished() {
  if (!enabled()) return;
  if (watchEnded) {
    watchEnded = false;
    return;
  }
  stopWatchWorkout();
}

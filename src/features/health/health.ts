import { useEffect, useState } from 'react';

import { healthProbe, type LiveHealth, type WorkoutHealth } from '../../../modules/health-probe';

export type { WorkoutHealth };

// Heart rate and calories the Apple Watch has written to Health since the workout started.
export function useLiveHealth(startedAt: number | null) {
  const [live, setLive] = useState<LiveHealth | null>(null);
  useEffect(() => {
    if (!healthProbe || startedAt === null) return;
    const probe = healthProbe;
    const sub = probe.addListener('onLive', setLive);
    probe
      .requestAccess()
      .then((ok) => ok && probe.startLive(startedAt))
      .catch(() => {});
    return () => {
      sub.remove();
      probe.stopLive();
    };
  }, [startedAt]);
  return live;
}

export function workoutHealth(startMs: number, endMs: number): Promise<WorkoutHealth | null> {
  if (!healthProbe) return Promise.resolve(null);
  return healthProbe.workoutStats(startMs, endMs).catch(() => null);
}

export type HeartSummary = { avg: number; min: number; max: number; buckets: number[] };

// Time-weighted enough for a summary: samples come every few seconds during a Watch workout.
export function heartSummary(points: [number, number][], buckets = 24): HeartSummary | null {
  if (!points.length) return null;
  const bpm = points.map((p) => p[1]);
  const start = points[0][0];
  const span = Math.max(1, points[points.length - 1][0] - start);
  const sums = Array<number>(buckets).fill(0);
  const counts = Array<number>(buckets).fill(0);
  for (const [t, v] of points) {
    const i = Math.min(buckets - 1, Math.floor(((t - start) / span) * buckets));
    sums[i] += v;
    counts[i]++;
  }
  return {
    avg: Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length),
    min: Math.round(Math.min(...bpm)),
    max: Math.round(Math.max(...bpm)),
    buckets: sums.map((s, i) => (counts[i] ? Math.round(s / counts[i]) : 0)),
  };
}

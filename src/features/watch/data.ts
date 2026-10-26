import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { healthLink, workout } from '@/db/schema';

import type { WatchData } from './shortcuts';

export const watchTables = ['health_link'];

export const latestFinishedWorkout = () =>
  db
    .select({ id: workout.id, startedAt: workout.startedAt, endedAt: workout.endedAt })
    .from(workout)
    .where(and(eq(workout.status, 'finished'), isNull(workout.deletedAt)))
    .orderBy(desc(workout.startedAt))
    .limit(1)
    .get() ?? null;

export const getWatchData = (workoutId: string) =>
  db.select().from(healthLink).where(eq(healthLink.workoutId, workoutId)).get() ?? null;

export function saveWatchData(workoutId: string, data: WatchData) {
  const w = db
    .select({ startedAt: workout.startedAt, endedAt: workout.endedAt })
    .from(workout)
    .where(eq(workout.id, workoutId))
    .get();
  if (!w || (data.kcal === null && data.hr.length === 0)) return;
  const end = w.endedAt ?? Date.now();
  const step = data.hr.length > 1 ? (end - w.startedAt) / (data.hr.length - 1) : 0;
  db.transaction((tx) => {
    tx.delete(healthLink).where(eq(healthLink.workoutId, workoutId)).run();
    tx.insert(healthLink)
      .values({
        id: randomUUID(),
        workoutId,
        hkUuid: `watch:${workoutId}`,
        activityType: 'traditionalStrengthTraining',
        hkStart: w.startedAt,
        hkEnd: end,
        activeEnergyKcal: data.kcal,
        avgHr: data.hr.length ? data.hr.reduce((a, b) => a + b, 0) / data.hr.length : null,
        maxHr: data.hr.length ? Math.max(...data.hr) : null,
        // shortcut: Shortcuts returns bare values, so sample times are spread evenly over the workout
        hrSamples: data.hr.map((bpm, i) => [Math.round(w.startedAt + i * step), bpm]),
        linkMode: 'auto',
      })
      .run();
  });
}

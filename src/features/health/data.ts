import { and, eq, gte, isNotNull, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { dismissedHealthWorkout, healthLink, workout } from '@/db/schema';

import type { HealthDetails } from './healthkit';
import type { AppSession, HealthWorkout } from './match';

export const healthTables = ['health_link', 'dismissed_health_workout', 'workout'];

export const getLink = (workoutId: string) =>
  db.select().from(healthLink).where(eq(healthLink.workoutId, workoutId)).get() ?? null;

export function linkWorkout(
  workoutId: string,
  h: HealthWorkout,
  details: HealthDetails | null,
  mode: 'auto' | 'manual',
) {
  db.transaction((tx) => {
    tx.delete(dismissedHealthWorkout).where(eq(dismissedHealthWorkout.hkUuid, h.uuid)).run();
    tx.delete(healthLink).where(eq(healthLink.workoutId, workoutId)).run();
    tx.delete(healthLink).where(eq(healthLink.hkUuid, h.uuid)).run();
    tx.insert(healthLink)
      .values({
        id: randomUUID(),
        workoutId,
        hkUuid: h.uuid,
        activityType: h.activityType,
        hkStart: h.start,
        hkEnd: h.end,
        activeEnergyKcal: details?.activeEnergyKcal ?? null,
        avgHr: details?.avgHr ?? null,
        maxHr: details?.maxHr ?? null,
        hrSamples: details?.hrSamples ?? null,
        linkMode: mode,
      })
      .run();
  });
}

export function unlinkWorkout(workoutId: string) {
  const link = getLink(workoutId);
  if (!link) return;
  db.transaction((tx) => {
    tx.delete(healthLink).where(eq(healthLink.id, link.id)).run();
    tx.insert(dismissedHealthWorkout)
      .values({ hkUuid: link.hkUuid, dismissedAt: Date.now() })
      .onConflictDoNothing()
      .run();
  });
}

export function sessionFor(workoutId: string): AppSession | null {
  const w = db
    .select({ id: workout.id, start: workout.startedAt, end: workout.endedAt })
    .from(workout)
    .where(eq(workout.id, workoutId))
    .get();
  return w ? { id: w.id, start: w.start, end: w.end ?? w.start } : null;
}

export function unlinkedSessions(since: number): AppSession[] {
  return db
    .select({ id: workout.id, start: workout.startedAt, end: workout.endedAt })
    .from(workout)
    .leftJoin(healthLink, eq(healthLink.workoutId, workout.id))
    .where(
      and(
        eq(workout.status, 'finished'),
        isNull(workout.deletedAt),
        isNull(healthLink.id),
        isNotNull(workout.endedAt),
        gte(workout.startedAt, since),
      ),
    )
    .all()
    .map((w) => ({ id: w.id, start: w.start, end: w.end ?? w.start }));
}

export function excludedUuids() {
  const linked = db.select({ uuid: healthLink.hkUuid }).from(healthLink).all();
  const dismissed = db
    .select({ uuid: dismissedHealthWorkout.hkUuid })
    .from(dismissedHealthWorkout)
    .all();
  const exported = db
    .select({ uuid: workout.exportedHkUuid })
    .from(workout)
    .where(isNotNull(workout.exportedHkUuid))
    .all();
  return new Set(
    [...linked, ...dismissed, ...exported].map((r) => r.uuid).filter((u): u is string => !!u),
  );
}

export function takenUuids(workoutId: string) {
  const linked = db
    .select({ uuid: healthLink.hkUuid, workoutId: healthLink.workoutId })
    .from(healthLink)
    .all()
    .filter((r) => r.workoutId !== workoutId);
  const exported = db
    .select({ uuid: workout.exportedHkUuid })
    .from(workout)
    .where(isNotNull(workout.exportedHkUuid))
    .all();
  return new Set([...linked, ...exported].map((r) => r.uuid).filter((u): u is string => !!u));
}

export const setExported = (workoutId: string, uuid: string) =>
  db.update(workout).set({ exportedHkUuid: uuid }).where(eq(workout.id, workoutId)).run();

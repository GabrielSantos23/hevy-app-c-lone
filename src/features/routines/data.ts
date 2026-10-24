import { and, asc, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { exercise, folder, routine, routineExercise, routineSet } from '@/db/schema';
import type { Draft } from '@/stores/routine-draft';

import { type EstimateEntry } from './estimate';
import { fromDraftSet, type SetValues, toDraftSet, type UnitPrefs } from './convert';

const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

const groupBy = <T>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
};

export const routineTables = ['folder', 'routine', 'routine_exercise', 'routine_set'];

export type RoutineSummary = {
  id: string;
  name: string;
  folderId: string | null;
  exercises: (EstimateEntry & { name: string; namePt: string | null })[];
};

export function routineList() {
  const folders = db
    .select({ id: folder.id, name: folder.name })
    .from(folder)
    .where(isNull(folder.deletedAt))
    .orderBy(asc(folder.position))
    .all();
  const routines = db
    .select({ id: routine.id, name: routine.name, folderId: routine.folderId })
    .from(routine)
    .where(isNull(routine.deletedAt))
    .orderBy(asc(routine.position))
    .all();
  const entries = db
    .select({
      id: routineExercise.id,
      routineId: routineExercise.routineId,
      restSeconds: routineExercise.restSeconds,
      name: exercise.name,
      namePt: exercise.namePt,
      type: exercise.type,
    })
    .from(routineExercise)
    .innerJoin(exercise, eq(exercise.id, routineExercise.exerciseId))
    .orderBy(asc(routineExercise.position))
    .all();
  const sets = db
    .select({
      entryId: routineSet.routineExerciseId,
      setType: routineSet.setType,
      durationS: routineSet.durationS,
    })
    .from(routineSet)
    .all();

  const setsByEntry = groupBy(sets, (s) => s.entryId);
  const entriesByRoutine = groupBy(entries, (e) => e.routineId);
  const summaries: RoutineSummary[] = routines.map((r) => ({
    ...r,
    exercises: (entriesByRoutine.get(r.id) ?? []).map((e) => ({
      name: e.name,
      namePt: e.namePt,
      type: e.type,
      restSeconds: e.restSeconds,
      sets: setsByEntry.get(e.id) ?? [],
    })),
  }));
  return { folders, routines: summaries };
}

export function loadDraft(routineId: string, units: UnitPrefs): Draft | null {
  const r = db.select().from(routine).where(eq(routine.id, routineId)).get();
  if (!r) return null;
  const entries = db
    .select({ entry: routineExercise, exercise })
    .from(routineExercise)
    .innerJoin(exercise, eq(exercise.id, routineExercise.exerciseId))
    .where(eq(routineExercise.routineId, routineId))
    .orderBy(asc(routineExercise.position))
    .all();
  const sets = entries.length
    ? db
        .select()
        .from(routineSet)
        .where(
          inArray(
            routineSet.routineExerciseId,
            entries.map((e) => e.entry.id),
          ),
        )
        .orderBy(asc(routineSet.position))
        .all()
    : [];
  const setsByEntry = groupBy(sets, (s) => s.routineExerciseId);
  return {
    routineId: r.id,
    folderId: r.folderId,
    name: r.name,
    notes: r.notes ?? '',
    exercises: entries.map(({ entry, exercise: ex }) => ({
      key: entry.id,
      exerciseId: ex.id,
      name: ex.name,
      namePt: ex.namePt,
      type: ex.type,
      primaryMuscle: ex.primaryMuscle,
      secondaryMuscles: ex.secondaryMuscles,
      bodyweightFactor: ex.bodyweightFactor,
      restSeconds: entry.restSeconds ?? 0,
      supersetGroup: entry.supersetGroup,
      notes: entry.notes ?? '',
      sets: (setsByEntry.get(entry.id) ?? []).map((s) =>
        toDraftSet({ ...s, rpe: s.targetRpe }, units, ex.type === 'short_distance_weight'),
      ),
    })),
  };
}

const routineSetValues = ({ rpe, ...v }: SetValues) => ({ ...v, targetRpe: rpe });

const nextPosition = (table: typeof routine | typeof folder) =>
  (db
    .select({ p: max(table.position) })
    .from(table)
    .get()?.p ?? -1) + 1;

export function saveDraft(draft: Draft, units: UnitPrefs): string {
  const id = draft.routineId ?? randomUUID();
  const fields = {
    name: draft.name.trim(),
    notes: draft.notes.trim() || null,
    folderId: draft.folderId,
  };
  db.transaction((tx) => {
    if (draft.routineId) {
      tx.update(routine)
        .set({ ...fields, updatedAt: now })
        .where(eq(routine.id, id))
        .run();
      tx.delete(routineExercise).where(eq(routineExercise.routineId, id)).run();
    } else {
      tx.insert(routine)
        .values({ id, ...fields, position: nextPosition(routine) })
        .run();
    }
    draft.exercises.forEach((e, position) => {
      const entryId = randomUUID();
      tx.insert(routineExercise)
        .values({
          id: entryId,
          routineId: id,
          exerciseId: e.exerciseId,
          position,
          supersetGroup: e.supersetGroup,
          restSeconds: e.restSeconds,
          notes: e.notes.trim() || null,
        })
        .run();
      if (e.sets.length)
        tx.insert(routineSet)
          .values(
            e.sets.map((s, i) => ({
              id: randomUUID(),
              routineExerciseId: entryId,
              position: i,
              ...routineSetValues(fromDraftSet(s, units, e.type === 'short_distance_weight')),
            })),
          )
          .run();
    });
  });
  return id;
}

export function deleteRoutine(id: string) {
  db.update(routine).set({ deletedAt: now, updatedAt: now }).where(eq(routine.id, id)).run();
}

export function duplicateRoutine(id: string, copySuffix: string, units: UnitPrefs) {
  const draft = loadDraft(id, units);
  if (!draft) return;
  saveDraft({ ...draft, routineId: null, name: `${draft.name} ${copySuffix}` }, units);
}

export function moveRoutine(id: string, folderId: string | null) {
  db.update(routine).set({ folderId, updatedAt: now }).where(eq(routine.id, id)).run();
}

export function createFolder(name: string) {
  db.insert(folder)
    .values({ id: randomUUID(), name: name.trim(), position: nextPosition(folder) })
    .run();
}

export function renameFolder(id: string, name: string) {
  db.update(folder).set({ name: name.trim(), updatedAt: now }).where(eq(folder.id, id)).run();
}

export function deleteFolder(id: string) {
  db.transaction((tx) => {
    tx.update(routine)
      .set({ folderId: null, updatedAt: now })
      .where(and(eq(routine.folderId, id), isNull(routine.deletedAt)))
      .run();
    tx.update(folder).set({ deletedAt: now, updatedAt: now }).where(eq(folder.id, id)).run();
  });
}

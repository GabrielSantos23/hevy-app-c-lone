import { and, eq, isNull, max } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { exercise, folder, routine, routineExercise, routineSet } from '@/db/schema';
import { buildMatcher, inferCustom } from '@/features/csv/match';

import { type HevySet, hevySetValues } from './sets';

export type HevyRoutine = {
  title: string;
  folder_id: number | null;
  notes?: string | null;
  exercises: {
    title: string;
    rest_seconds: number | null;
    notes: string | null;
    superset_id: number | null;
    sets: HevySet[];
  }[];
};
export type HevyFolder = { id: number; title: string };

// Routines whose name already exists are skipped, so importing twice adds nothing.
export function importHevyRoutines(routines: HevyRoutine[], folders: HevyFolder[]) {
  const existing = new Set(
    db
      .select({ name: routine.name })
      .from(routine)
      .where(isNull(routine.deletedAt))
      .all()
      .map((r) => r.name),
  );
  const fresh = routines.filter((r) => !existing.has(r.title));
  const library = db
    .select({ id: exercise.id, name: exercise.name, equipment: exercise.equipment })
    .from(exercise)
    .where(isNull(exercise.deletedAt))
    .all();
  const match = buildMatcher(library);
  let exercisesCreated = 0;

  db.transaction((tx) => {
    const position = (table: typeof routine | typeof folder) =>
      (tx
        .select({ p: max(table.position) })
        .from(table)
        .get()?.p ?? -1) + 1;
    const folderIds = new Map<number, string>();
    for (const f of folders) {
      if (!fresh.some((r) => r.folder_id === f.id)) continue;
      const same = tx
        .select({ id: folder.id })
        .from(folder)
        .where(and(eq(folder.name, f.title), isNull(folder.deletedAt)))
        .get();
      const id = same?.id ?? randomUUID();
      if (!same)
        tx.insert(folder)
          .values({ id, name: f.title, position: position(folder) })
          .run();
      folderIds.set(f.id, id);
    }
    const exerciseIds = new Map<string, string>();
    for (const r of fresh) {
      const routineId = randomUUID();
      tx.insert(routine)
        .values({
          id: routineId,
          name: r.title,
          notes: r.notes || null,
          folderId: r.folder_id === null ? null : (folderIds.get(r.folder_id) ?? null),
          position: position(routine),
        })
        .run();
      r.exercises.forEach((e, i) => {
        let exerciseId = exerciseIds.get(e.title) ?? match(e.title);
        if (!exerciseId) {
          exerciseId = randomUUID();
          const sets = e.sets.map((s) => ({
            ...hevySetValues(s),
            distanceM: s.distance_meters,
            rpe: null,
          }));
          tx.insert(exercise)
            .values({
              id: exerciseId,
              name: e.title,
              ...inferCustom(e.title, sets),
              isCustom: true,
            })
            .run();
          exercisesCreated++;
        }
        exerciseIds.set(e.title, exerciseId);
        const entryId = randomUUID();
        tx.insert(routineExercise)
          .values({
            id: entryId,
            routineId,
            exerciseId,
            position: i,
            supersetGroup: e.superset_id,
            restSeconds: e.rest_seconds,
            notes: e.notes || null,
          })
          .run();
        if (e.sets.length)
          tx.insert(routineSet)
            .values(
              e.sets.map((s, j) => ({
                id: randomUUID(),
                routineExerciseId: entryId,
                position: j,
                ...hevySetValues(s),
              })),
            )
            .run();
      });
    }
  });
  return { routines: fresh.length, skipped: routines.length - fresh.length, exercisesCreated };
}

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { db } from '@/db/client';
import {
  exercise,
  importBatch,
  measurement,
  workout,
  workoutExercise,
  workoutSet,
} from '@/db/schema';

import { listMeasurements } from '../measurements/data';
import { workoutSummaries } from '../stats/data';
import {
  exportHevyMeasurements,
  exportHevyWorkouts,
  type ExportUnits,
  type ImportedMeasurement,
  type ImportedSet,
  type ImportedWorkout,
} from './csv';
import { buildMatcher, inferCustom } from './match';

const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const importTables = ['import_batch'];

export type ImportResult = {
  batchId: string;
  workouts: number;
  skipped: number;
  sets: number;
  exercisesCreated: number;
  measurements: number;
};

function newBatch(source: 'hevy' | 'strong', fileName: string) {
  const id = randomUUID();
  db.insert(importBatch).values({ id, source, fileName, importedAt: Date.now() }).run();
  return id;
}

export function importWorkouts(
  workouts: ImportedWorkout[],
  source: 'hevy' | 'strong',
  fileName: string,
): ImportResult {
  const existing = new Set(
    db
      .select({ name: workout.name, startedAt: workout.startedAt })
      .from(workout)
      .where(isNull(workout.deletedAt))
      .all()
      .map((w) => `${w.startedAt}|${w.name}`),
  );
  const fresh = workouts.filter((w) => !existing.has(`${w.startedAt}|${w.title}`));
  const empty = {
    batchId: '',
    workouts: 0,
    skipped: workouts.length,
    sets: 0,
    exercisesCreated: 0,
    measurements: 0,
  };
  if (!fresh.length) return empty;
  const library = db
    .select({ id: exercise.id, name: exercise.name, equipment: exercise.equipment })
    .from(exercise)
    .where(isNull(exercise.deletedAt))
    .all();
  const match = buildMatcher(library);
  const setsByTitle = new Map<string, ImportedSet[]>();
  for (const w of fresh)
    for (const e of w.exercises)
      setsByTitle.set(e.title, [...(setsByTitle.get(e.title) ?? []), ...e.sets]);

  let batchId = '';
  let exercisesCreated = 0;
  let sets = 0;
  db.transaction((tx) => {
    batchId = newBatch(source, fileName);
    const ids = new Map<string, string>();
    for (const [title, titleSets] of setsByTitle) {
      const matched = match(title);
      if (matched) {
        ids.set(title, matched);
        continue;
      }
      const id = randomUUID();
      const inferred = inferCustom(title, titleSets);
      tx.insert(exercise)
        .values({ id, name: title, ...inferred, isCustom: true, importBatchId: batchId })
        .run();
      ids.set(title, id);
      exercisesCreated++;
    }
    for (const w of fresh) {
      const workoutId = randomUUID();
      tx.insert(workout)
        .values({
          id: workoutId,
          name: w.title,
          notes: w.notes || null,
          startedAt: w.startedAt,
          endedAt: w.endedAt,
          status: 'finished',
          importBatchId: batchId,
        })
        .run();
      w.exercises.forEach((e, position) => {
        const entryId = randomUUID();
        tx.insert(workoutExercise)
          .values({
            id: entryId,
            workoutId,
            exerciseId: ids.get(e.title)!,
            position,
            supersetGroup: e.supersetId,
            notes: e.notes || null,
          })
          .run();
        tx.insert(workoutSet)
          .values(
            e.sets.map((s, i) => ({
              id: randomUUID(),
              workoutExerciseId: entryId,
              position: i,
              ...s,
            })),
          )
          .run();
        sets += e.sets.length;
      });
    }
    tx.update(importBatch)
      .set({ workoutsCount: fresh.length, exercisesCount: exercisesCreated })
      .where(eq(importBatch.id, batchId))
      .run();
  });
  return {
    batchId,
    workouts: fresh.length,
    skipped: workouts.length - fresh.length,
    sets,
    exercisesCreated,
    measurements: 0,
  };
}

export function importMeasurements(items: ImportedMeasurement[], fileName: string): ImportResult {
  const existing = new Set(
    db
      .select({ at: measurement.measuredAt })
      .from(measurement)
      .where(isNull(measurement.deletedAt))
      .all()
      .map((m) => m.at),
  );
  const fresh = items.filter((m) => !existing.has(m.measuredAt));
  if (!fresh.length)
    return {
      batchId: '',
      workouts: 0,
      skipped: items.length,
      sets: 0,
      exercisesCreated: 0,
      measurements: 0,
    };
  let batchId = '';
  db.transaction((tx) => {
    batchId = newBatch('hevy', fileName);
    for (const m of fresh)
      tx.insert(measurement)
        .values({ id: randomUUID(), measuredAt: m.measuredAt, ...m.values, importBatchId: batchId })
        .run();
    tx.update(importBatch)
      .set({ measurementsCount: fresh.length })
      .where(eq(importBatch.id, batchId))
      .run();
  });
  return {
    batchId,
    workouts: 0,
    skipped: items.length - fresh.length,
    sets: 0,
    exercisesCreated: 0,
    measurements: fresh.length,
  };
}

export const listImports = () =>
  db
    .select()
    .from(importBatch)
    .where(isNull(importBatch.revertedAt))
    .orderBy(desc(importBatch.importedAt))
    .all();

export function undoImport(batchId: string) {
  db.transaction((tx) => {
    const soft = { deletedAt: now, updatedAt: now };
    tx.update(workout)
      .set(soft)
      .where(and(eq(workout.importBatchId, batchId), isNull(workout.deletedAt)))
      .run();
    tx.update(measurement)
      .set(soft)
      .where(and(eq(measurement.importBatchId, batchId), isNull(measurement.deletedAt)))
      .run();
    tx.update(exercise)
      .set(soft)
      .where(and(eq(exercise.importBatchId, batchId), isNull(exercise.deletedAt)))
      .run();
    tx.update(importBatch).set({ revertedAt: Date.now() }).where(eq(importBatch.id, batchId)).run();
  });
}

async function shareCsv(name: string, content: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
}

export function exportWorkouts(units: ExportUnits) {
  const workouts: ImportedWorkout[] = workoutSummaries(null, true).map((w) => ({
    title: w.name,
    startedAt: w.startedAt,
    endedAt: w.startedAt + w.durationS * 1000,
    notes: w.notes ?? '',
    exercises: w.exercises.map((e) => ({
      title: e.name,
      notes: e.notes ?? '',
      supersetId: e.supersetGroup,
      sets: e.sets.map((s) => ({
        setType: s.setType,
        weightKg: s.weightKg,
        reps: s.reps,
        distanceM: s.distanceM,
        durationS: s.durationS,
        rpe: s.rpe,
      })),
    })),
  }));
  return shareCsv('workout_data.csv', exportHevyWorkouts(workouts, units));
}

export function exportMeasurements(units: ExportUnits) {
  const items: ImportedMeasurement[] = listMeasurements().map(
    ({ id: _id, measuredAt, ...values }) => ({
      measuredAt,
      values,
    }),
  );
  return shareCsv('measurements.csv', exportHevyMeasurements(items, units));
}

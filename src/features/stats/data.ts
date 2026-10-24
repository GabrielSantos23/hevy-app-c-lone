import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercise, type Muscle, workout, workoutExercise, workoutSet } from '@/db/schema';

import { setVolume } from '../workouts/stats';
import type { HistorySet, Session } from './calc';

const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const historyTables = ['workout', 'workout_exercise', 'workout_set'];

const finished = and(eq(workout.status, 'finished'), isNull(workout.deletedAt));

function setRows(workoutIds: string[]) {
  if (!workoutIds.length) return [];
  return db
    .select({
      workoutId: workoutExercise.workoutId,
      entryId: workoutExercise.id,
      entryPosition: workoutExercise.position,
      notes: workoutExercise.notes,
      supersetGroup: workoutExercise.supersetGroup,
      exerciseId: exercise.id,
      name: exercise.name,
      namePt: exercise.namePt,
      type: exercise.type,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      bodyweightFactor: exercise.bodyweightFactor,
      set: workoutSet,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(inArray(workoutExercise.workoutId, workoutIds))
    .orderBy(asc(workoutExercise.position), asc(workoutSet.position))
    .all();
}

type Row = ReturnType<typeof setRows>[number];

export type WorkoutExerciseDetail = Pick<
  Row,
  | 'entryId'
  | 'exerciseId'
  | 'name'
  | 'namePt'
  | 'type'
  | 'notes'
  | 'supersetGroup'
  | 'primaryMuscle'
  | 'secondaryMuscles'
  | 'bodyweightFactor'
> & { sets: Row['set'][] };

function groupExercises(rows: Row[]): WorkoutExerciseDetail[] {
  const byEntry = new Map<string, WorkoutExerciseDetail>();
  for (const { set, workoutId: _w, entryPosition: _p, ...entry } of rows) {
    const existing = byEntry.get(entry.entryId);
    if (existing) existing.sets.push(set);
    else byEntry.set(entry.entryId, { ...entry, sets: [set] });
  }
  return [...byEntry.values()];
}

export type WorkoutSummary = {
  id: string;
  name: string;
  notes: string | null;
  startedAt: number;
  durationS: number;
  volume: number;
  reps: number;
  sets: number;
  exercises: WorkoutExerciseDetail[];
};

export function workoutSummaries(
  bodyWeightKg: number | null,
  countWarmups: boolean,
  ids?: string[],
) {
  const workouts = db
    .select()
    .from(workout)
    .where(ids ? and(finished, inArray(workout.id, ids)) : finished)
    .orderBy(desc(workout.startedAt))
    .all();
  const rowsByWorkout = new Map<string, Row[]>();
  for (const r of setRows(workouts.map((w) => w.id))) {
    const list = rowsByWorkout.get(r.workoutId);
    if (list) list.push(r);
    else rowsByWorkout.set(r.workoutId, [r]);
  }
  return workouts.map((w): WorkoutSummary => {
    const exercises = groupExercises(rowsByWorkout.get(w.id) ?? []);
    let volume = 0;
    let reps = 0;
    let sets = 0;
    for (const e of exercises)
      for (const s of e.sets) {
        if (!countWarmups && s.setType === 'warmup') continue;
        sets++;
        reps += s.reps ?? 0;
        volume += setVolume(e.type, s, e.bodyweightFactor, bodyWeightKg);
      }
    return {
      id: w.id,
      name: w.name,
      notes: w.notes,
      startedAt: w.startedAt,
      durationS: Math.round(((w.endedAt ?? w.startedAt) - w.startedAt) / 1000),
      volume,
      reps,
      sets,
      exercises,
    };
  });
}

export function exerciseSessions(exerciseId: string): Session[] {
  const rows = db
    .select({ workoutId: workout.id, startedAt: workout.startedAt, set: workoutSet })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(workoutExercise.exerciseId, exerciseId), finished))
    .orderBy(asc(workout.startedAt), asc(workoutSet.position))
    .all();
  const sessions = new Map<string, Session>();
  for (const { workoutId, startedAt, set } of rows) {
    const s: HistorySet = set;
    const existing = sessions.get(workoutId);
    if (existing) existing.sets.push(s);
    else sessions.set(workoutId, { workoutId, startedAt, sets: [s] });
  }
  return [...sessions.values()];
}

export function deleteWorkout(id: string) {
  db.update(workout).set({ deletedAt: now, updatedAt: now }).where(eq(workout.id, id)).run();
}

export function muscleSplit(exercises: WorkoutExerciseDetail[]) {
  const result: Partial<Record<Muscle, number>> = {};
  for (const e of exercises) {
    const n = e.sets.filter((s) => s.setType !== 'warmup').length;
    if (!n) continue;
    result[e.primaryMuscle] = (result[e.primaryMuscle] ?? 0) + n;
    for (const m of e.secondaryMuscles) result[m] = (result[m] ?? 0) + n * 0.5;
  }
  return result;
}

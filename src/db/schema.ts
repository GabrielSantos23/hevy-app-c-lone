import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const exerciseTypes = [
  'weight_reps',
  'reps_only',
  'bodyweight_reps',
  'bodyweight_assisted_reps',
  'duration',
  'weight_duration',
  'distance_duration',
  'short_distance_weight',
  'floors_duration',
  'steps_duration',
] as const;

export const equipments = [
  'none',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'plate',
  'resistance_band',
  'suspension',
  'other',
] as const;

export const muscles = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'cardio',
  'chest',
  'forearms',
  'full_body',
  'glutes',
  'hamstrings',
  'lats',
  'lower_back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
  'upper_back',
  'other',
] as const;

export const setTypes = ['normal', 'warmup', 'dropset', 'failure'] as const;

export const recordKinds = [
  'best_weight',
  'best_reps',
  'best_volume',
  'best_1rm',
  'best_duration',
  'best_distance',
  'most_floors',
  'most_steps',
] as const;

export type ExerciseType = (typeof exerciseTypes)[number];
export type Equipment = (typeof equipments)[number];
export type Muscle = (typeof muscles)[number];
export type SetType = (typeof setTypes)[number];
export type RecordKind = (typeof recordKinds)[number];

const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

const timestamps = {
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
};

const importBatchId = () => text('import_batch_id').references(() => importBatch.id);

export const importBatch = sqliteTable('import_batch', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['hevy', 'strong'] }).notNull(),
  fileName: text('file_name').notNull(),
  importedAt: integer('imported_at').notNull(),
  workoutsCount: integer('workouts_count').notNull().default(0),
  exercisesCount: integer('exercises_count').notNull().default(0),
  measurementsCount: integer('measurements_count').notNull().default(0),
  revertedAt: integer('reverted_at'),
});

export const exercise = sqliteTable(
  'exercise',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    namePt: text('name_pt'),
    type: text('type', { enum: exerciseTypes }).notNull(),
    equipment: text('equipment', { enum: equipments }).notNull(),
    primaryMuscle: text('primary_muscle', { enum: muscles }).notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' })
      .$type<Muscle[]>()
      .notNull()
      .default(sql`'[]'`),
    bodyweightFactor: real('bodyweight_factor').notNull().default(0),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    source: text('source'),
    sourceId: text('source_id'),
    instructions: text('instructions'),
    importBatchId: importBatchId(),
    ...timestamps,
  },
  (t) => [
    index('exercise_name_idx').on(t.name),
    uniqueIndex('exercise_source_idx').on(t.source, t.sourceId),
  ],
);

export const folder = sqliteTable('folder', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  ...timestamps,
});

export const routine = sqliteTable(
  'routine',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id').references(() => folder.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    notes: text('notes'),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [index('routine_folder_idx').on(t.folderId, t.position)],
);

const exerciseEntryColumns = {
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercise.id),
  position: integer('position').notNull(),
  supersetGroup: integer('superset_group'),
  restSeconds: integer('rest_seconds'),
  notes: text('notes'),
  volumeDoubling: integer('volume_doubling', { mode: 'boolean' }).notNull().default(false),
};

const setValueColumns = {
  position: integer('position').notNull(),
  setType: text('set_type', { enum: setTypes }).notNull().default('normal'),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  durationS: integer('duration_s'),
  distanceM: real('distance_m'),
  customMetric: real('custom_metric'),
};

export const routineExercise = sqliteTable(
  'routine_exercise',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routine.id, { onDelete: 'cascade' }),
    ...exerciseEntryColumns,
    ...timestamps,
  },
  (t) => [index('routine_exercise_routine_idx').on(t.routineId, t.position)],
);

export const routineSet = sqliteTable(
  'routine_set',
  {
    id: text('id').primaryKey(),
    routineExerciseId: text('routine_exercise_id')
      .notNull()
      .references(() => routineExercise.id, { onDelete: 'cascade' }),
    ...setValueColumns,
    repMin: integer('rep_min'),
    repMax: integer('rep_max'),
    targetRpe: real('target_rpe'),
    ...timestamps,
  },
  (t) => [index('routine_set_exercise_idx').on(t.routineExerciseId, t.position)],
);

export const workout = sqliteTable(
  'workout',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id').references(() => routine.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    notes: text('notes'),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    status: text('status', { enum: ['in_progress', 'finished'] }).notNull(),
    exportedHkUuid: text('exported_hk_uuid'),
    importBatchId: importBatchId(),
    ...timestamps,
  },
  (t) => [
    index('workout_started_idx').on(t.startedAt),
    uniqueIndex('workout_single_active_idx')
      .on(t.status)
      .where(sql`status = 'in_progress' and deleted_at is null`),
  ],
);

export const workoutExercise = sqliteTable(
  'workout_exercise',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workout.id, { onDelete: 'cascade' }),
    ...exerciseEntryColumns,
    ...timestamps,
  },
  (t) => [
    index('workout_exercise_workout_idx').on(t.workoutId, t.position),
    index('workout_exercise_exercise_idx').on(t.exerciseId),
  ],
);

export const workoutSet = sqliteTable(
  'workout_set',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercise.id, { onDelete: 'cascade' }),
    ...setValueColumns,
    rpe: real('rpe'),
    completedAt: integer('completed_at'),
    ...timestamps,
  },
  (t) => [index('workout_set_exercise_idx').on(t.workoutExerciseId, t.position)],
);

export const personalRecord = sqliteTable(
  'personal_record',
  {
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: recordKinds }).notNull(),
    value: real('value').notNull(),
    workoutSetId: text('workout_set_id')
      .notNull()
      .references(() => workoutSet.id, { onDelete: 'cascade' }),
    achievedAt: integer('achieved_at').notNull(),
  },
  (t) => [uniqueIndex('personal_record_pk').on(t.exerciseId, t.kind)],
);

export const healthLink = sqliteTable('health_link', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id')
    .notNull()
    .unique()
    .references(() => workout.id, { onDelete: 'cascade' }),
  hkUuid: text('hk_uuid').notNull().unique(),
  activityType: text('activity_type').notNull(),
  hkStart: integer('hk_start').notNull(),
  hkEnd: integer('hk_end').notNull(),
  activeEnergyKcal: real('active_energy_kcal'),
  avgHr: real('avg_hr'),
  maxHr: real('max_hr'),
  hrSamples: text('hr_samples', { mode: 'json' }).$type<[number, number][]>(),
  linkMode: text('link_mode', { enum: ['auto', 'manual'] }).notNull(),
  ...timestamps,
});

export const dismissedHealthWorkout = sqliteTable('dismissed_health_workout', {
  hkUuid: text('hk_uuid').primaryKey(),
  dismissedAt: integer('dismissed_at').notNull(),
});

export const measurement = sqliteTable(
  'measurement',
  {
    id: text('id').primaryKey(),
    measuredAt: integer('measured_at').notNull(),
    weightKg: real('weight_kg'),
    fatPercent: real('fat_percent'),
    neckCm: real('neck_cm'),
    shoulderCm: real('shoulder_cm'),
    chestCm: real('chest_cm'),
    leftBicepCm: real('left_bicep_cm'),
    rightBicepCm: real('right_bicep_cm'),
    leftForearmCm: real('left_forearm_cm'),
    rightForearmCm: real('right_forearm_cm'),
    abdomenCm: real('abdomen_cm'),
    waistCm: real('waist_cm'),
    hipsCm: real('hips_cm'),
    leftThighCm: real('left_thigh_cm'),
    rightThighCm: real('right_thigh_cm'),
    leftCalfCm: real('left_calf_cm'),
    rightCalfCm: real('right_calf_cm'),
    importBatchId: importBatchId(),
    ...timestamps,
  },
  (t) => [index('measurement_date_idx').on(t.measuredAt)],
);

export const account = sqliteTable('account', {
  id: integer('id').primaryKey(),
  mode: text('mode', { enum: ['signed_out', 'signed_in'] })
    .notNull()
    .default('signed_out'),
  userId: text('user_id'),
  email: text('email'),
  lastSyncAt: integer('last_sync_at'),
});

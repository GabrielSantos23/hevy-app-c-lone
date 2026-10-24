import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';

import type { SeedExercise } from '@/features/exercises/gif-mapper';

import { db, sqlite } from '../client';
import { exercise } from '../schema';
import seed from './exercises.json';

const CHUNK = 100;
const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export function seedExercises() {
  const current = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  if (current?.user_version === seed.version) return;

  const rows = (seed.exercises as SeedExercise[]).map((e) => ({
    id: `seed:${e.sourceId}`,
    ...e,
  }));

  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += CHUNK) {
      tx.insert(exercise)
        .values(rows.slice(i, i + CHUNK))
        .onConflictDoUpdate({
          target: [exercise.source, exercise.sourceId],
          set: {
            name: sql`excluded.name`,
            type: sql`excluded.type`,
            equipment: sql`excluded.equipment`,
            primaryMuscle: sql`excluded.primary_muscle`,
            secondaryMuscles: sql`excluded.secondary_muscles`,
            bodyweightFactor: sql`excluded.bodyweight_factor`,
            instructions: sql`excluded.instructions`,
            deletedAt: null,
            updatedAt: now,
          },
        })
        .run();
    }
    tx.update(exercise)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(exercise.isCustom, false),
          isNull(exercise.deletedAt),
          notInArray(
            sql`${exercise.source} || ':' || ${exercise.sourceId}`,
            rows.map((r) => `${r.source}:${r.sourceId}`),
          ),
        ),
      )
      .run();
    tx.run(sql.raw(`PRAGMA user_version = ${Number(seed.version)}`));
  });
}

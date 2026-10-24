import { and, asc, eq, isNull, like, or, type SQL } from 'drizzle-orm';

import { db } from '@/db/client';
import { type Equipment, exercise, type Muscle } from '@/db/schema';

export type ExerciseFilter = {
  search: string;
  muscle: Muscle | null;
  equipment: Equipment | null;
};

export const searchTokens = (search: string): string[] =>
  search
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[%_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export function exerciseListQuery({ search, muscle, equipment }: ExerciseFilter) {
  const conditions: (SQL | undefined)[] = [
    isNull(exercise.deletedAt),
    muscle ? eq(exercise.primaryMuscle, muscle) : undefined,
    equipment ? eq(exercise.equipment, equipment) : undefined,
    ...searchTokens(search).map((t) =>
      or(like(exercise.name, `%${t}%`), like(exercise.namePt, `%${t}%`)),
    ),
  ];
  return db
    .select({
      id: exercise.id,
      name: exercise.name,
      namePt: exercise.namePt,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
      type: exercise.type,
      secondaryMuscles: exercise.secondaryMuscles,
      bodyweightFactor: exercise.bodyweightFactor,
      isCustom: exercise.isCustom,
    })
    .from(exercise)
    .where(and(...conditions))
    .orderBy(asc(exercise.name));
}

export type ExerciseListItem = Awaited<
  ReturnType<ReturnType<typeof exerciseListQuery>['all']>
>[number];

export const exerciseByIdQuery = (id: string) =>
  db.select().from(exercise).where(eq(exercise.id, id)).limit(1);

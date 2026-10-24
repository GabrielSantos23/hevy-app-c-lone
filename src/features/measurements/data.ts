import { desc, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { measurement } from '@/db/schema';

const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const lengthFields = [
  'neckCm',
  'shoulderCm',
  'chestCm',
  'leftBicepCm',
  'rightBicepCm',
  'leftForearmCm',
  'rightForearmCm',
  'abdomenCm',
  'waistCm',
  'hipsCm',
  'leftThighCm',
  'rightThighCm',
  'leftCalfCm',
  'rightCalfCm',
] as const;

export type LengthField = (typeof lengthFields)[number];

export type MeasurementValues = {
  measuredAt: number;
  weightKg: number | null;
  fatPercent: number | null;
} & Record<LengthField, number | null>;

export type Measurement = MeasurementValues & { id: string };

export const measurementTables = ['measurement'];

export const listMeasurements = (): Measurement[] =>
  db
    .select()
    .from(measurement)
    .where(isNull(measurement.deletedAt))
    .orderBy(desc(measurement.measuredAt))
    .all();

export const getMeasurement = (id: string): Measurement | undefined =>
  db.select().from(measurement).where(eq(measurement.id, id)).get();

export function saveMeasurement(id: string | null, values: MeasurementValues) {
  if (id)
    db.update(measurement)
      .set({ ...values, updatedAt: now })
      .where(eq(measurement.id, id))
      .run();
  else
    db.insert(measurement)
      .values({ id: randomUUID(), ...values })
      .run();
}

export function deleteMeasurement(id: string) {
  db.update(measurement)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(measurement.id, id))
    .run();
}

import { isRunningInExpoGo } from 'expo';

import type { HealthDetails } from './healthkit';
import type { HealthWorkout } from './match';

type Kit = typeof import('@kingstinct/react-native-healthkit');
type WorkoutActivityType = import('@kingstinct/react-native-healthkit/types').WorkoutActivityType;
type UpdateFrequency = Parameters<Kit['enableBackgroundDelivery']>[1];

export type { HealthDetails };

const WORKOUT = 'HKWorkoutTypeIdentifier';
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate';
const ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const STRENGTH = 50 as WorkoutActivityType;
const IMMEDIATE = 1 as UpdateFrequency;
const MAX_HR_POINTS = 240;

const activityNames: Record<number, string> = {
  11: 'crossTraining',
  13: 'cycling',
  16: 'elliptical',
  20: 'functionalStrengthTraining',
  35: 'rowing',
  37: 'running',
  50: 'traditionalStrengthTraining',
  52: 'walking',
  57: 'yoga',
  59: 'coreTraining',
  63: 'highIntensityIntervalTraining',
  73: 'mixedCardio',
};

let kit: Kit | null | undefined;

function load(): Kit | null {
  if (kit === undefined) {
    try {
      kit = isRunningInExpoGo() ? null : (require('@kingstinct/react-native-healthkit') as Kit);
    } catch {
      kit = null;
    }
  }
  return kit;
}

export const healthSupported = () => {
  try {
    return load()?.isHealthDataAvailable() ?? false;
  } catch {
    return false;
  }
};

export async function requestHealthAccess(write: boolean) {
  const hk = load();
  if (!hk) return false;
  return hk.requestAuthorization({
    toRead: [WORKOUT, HEART_RATE, ENERGY],
    toShare: write ? [WORKOUT, ENERGY] : [],
  });
}

export async function fetchHealthWorkouts(from: number, to: number): Promise<HealthWorkout[]> {
  const hk = load();
  if (!hk) return [];
  const workouts = await hk.queryWorkoutSamples({
    limit: 0,
    ascending: true,
    filter: { date: { startDate: new Date(from), endDate: new Date(to) } },
  });
  return workouts.map((w) => {
    const item = {
      uuid: w.uuid,
      start: w.startDate.getTime(),
      end: w.endDate.getTime(),
      activityType: activityNames[w.workoutActivityType] ?? 'other',
      source: w.sourceRevision?.source?.name ?? '',
    };
    w.dispose();
    return item;
  });
}

export async function fetchHealthDetails(uuid: string): Promise<HealthDetails | null> {
  const hk = load();
  if (!hk) return null;
  const [workout] = await hk.queryWorkoutSamples({ limit: 1, filter: { uuid } });
  if (!workout) return null;
  try {
    const [energy, heart, samples] = await Promise.all([
      workout.getStatistic(ENERGY, 'kcal'),
      workout.getStatistic(HEART_RATE, 'count/min'),
      hk.queryQuantitySamples(HEART_RATE, {
        limit: 0,
        ascending: true,
        unit: 'count/min',
        filter: { workout },
      }),
    ]);
    const step = Math.max(1, Math.ceil(samples.length / MAX_HR_POINTS));
    return {
      activeEnergyKcal:
        energy?.sumQuantity?.quantity ?? workout.totalEnergyBurned?.quantity ?? null,
      avgHr: heart?.averageQuantity?.quantity ?? null,
      maxHr: heart?.maximumQuantity?.quantity ?? null,
      hrSamples: samples
        .filter((_, i) => i % step === 0)
        .map((s): [number, number] => [s.startDate.getTime(), Math.round(s.quantity)]),
    };
  } finally {
    workout.dispose();
  }
}

export async function saveHealthWorkout(w: { id: string; start: number; end: number }) {
  const hk = load();
  if (!hk) return null;
  const saved = await hk.saveWorkoutSample(
    STRENGTH,
    [],
    new Date(w.start),
    new Date(w.end),
    undefined,
    { HKExternalUUID: w.id },
  );
  const uuid = saved.uuid;
  saved.dispose();
  return uuid;
}

export function watchHealthWorkouts(onChange: () => void) {
  const hk = load();
  if (!hk) return () => {};
  hk.enableBackgroundDelivery(WORKOUT, IMMEDIATE).catch(() => false);
  const subscription = hk.subscribeToChanges(WORKOUT, onChange);
  return () => subscription.remove();
}

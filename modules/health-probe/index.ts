import { requireOptionalNativeModule } from 'expo';

export type LiveHealth = { heartRate: number; activeKcal: number };
export type WorkoutHealth = {
  activeKcal: number;
  basalKcal: number;
  // [time ms, bpm], oldest first.
  heartRates: [number, number][];
};

type HealthModule = {
  probe(): Promise<string>;
  requestAccess(): Promise<boolean>;
  startLive(startMs: number): void;
  stopLive(): void;
  workoutStats(startMs: number, endMs: number): Promise<WorkoutHealth>;
  addListener(event: 'onLive', listener: (e: LiveHealth) => void): { remove(): void };
};

// Only in iOS builds; null in Expo Go and on Android.
export const healthProbe = requireOptionalNativeModule<HealthModule>('HealthProbe');

import { requireOptionalNativeModule } from 'expo';

export type LiveHealth = { heartRate: number; activeKcal: number };
export type WorkoutHealth = {
  activeKcal: number;
  basalKcal: number;
  // [time ms, bpm], oldest first.
  heartRates: [number, number][];
};

// From the watch app: started, ended, live (heartRate, activeKcal) or error (message).
export type WatchMessage = {
  event?: string;
  heartRate?: number;
  activeKcal?: number;
  message?: string;
};

type HealthModule = {
  probe(): Promise<string>;
  requestAccess(): Promise<boolean>;
  startLive(startMs: number): void;
  stopLive(): void;
  workoutStats(startMs: number, endMs: number): Promise<WorkoutHealth>;
  startWatchApp(): Promise<string>;
  sendToWatch(command: 'start' | 'end'): string;
  watchState(): string;
  addListener(event: 'onLive', listener: (e: LiveHealth) => void): { remove(): void };
  addListener(event: 'onWatch', listener: (e: WatchMessage) => void): { remove(): void };
};

// Only in iOS builds; null in Expo Go and on Android.
export const healthProbe = requireOptionalNativeModule<HealthModule>('HealthProbe');

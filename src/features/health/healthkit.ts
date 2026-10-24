import type { HealthWorkout } from './match';

export type HealthDetails = {
  activeEnergyKcal: number | null;
  avgHr: number | null;
  maxHr: number | null;
  hrSamples: [number, number][];
};

export const healthSupported = () => false;
export const requestHealthAccess = async (_write: boolean) => false;
export const fetchHealthWorkouts = async (
  _from: number,
  _to: number,
): Promise<HealthWorkout[]> => [];
export const fetchHealthDetails = async (_uuid: string): Promise<HealthDetails | null> => null;
export const saveHealthWorkout = async (_w: {
  id: string;
  start: number;
  end: number;
}): Promise<string | null> => null;
export const watchHealthWorkouts = (_onChange: () => void) => () => {};

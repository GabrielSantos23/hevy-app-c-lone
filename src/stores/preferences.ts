import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'dark' | 'light' | 'system';
export type LocalePreference = 'system' | 'en' | 'pt-BR';

export type Preferences = {
  theme: ThemePreference;
  locale: LocalePreference;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
  lengthUnit: 'cm' | 'in';
  previousValuesMode: 'any' | 'routine';
  rpeEnabled: boolean;
  defaultRestSeconds: number;
  restNotification: boolean;
  oneRmFormula: 'brzycki' | 'epley';
  countWarmupsInVolume: boolean;
  weekStart: 'monday' | 'sunday';
  bodyWeightKg: number | null;
  watchShortcuts: boolean;
};

type PreferencesStore = Preferences & {
  set: (patch: Partial<Preferences>) => void;
};

export const defaultPreferences: Preferences = {
  theme: 'dark',
  locale: 'system',
  weightUnit: 'kg',
  distanceUnit: 'km',
  lengthUnit: 'cm',
  previousValuesMode: 'any',
  rpeEnabled: true,
  defaultRestSeconds: 90,
  restNotification: true,
  oneRmFormula: 'brzycki',
  countWarmupsInVolume: false,
  weekStart: 'monday',
  bodyWeightKg: null,
  watchShortcuts: false,
};

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      set: (patch) => set(patch),
    }),
    {
      name: 'preferences',
      version: 1,
      storage: createJSONStorage(() => Storage),
      partialize: ({ set: _set, ...prefs }) => prefs,
    },
  ),
);

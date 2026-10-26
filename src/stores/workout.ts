import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type DraftExercise, type ExerciseActions, exerciseActions } from './exercise-draft';

export type ActiveWorkout = {
  routineId: string | null;
  name: string;
  notes: string;
  startedAt: number;
  exercises: DraftExercise[];
};

export type Rest = { endsAt: number; total: number; notificationId: string | null };

type WorkoutStore = ExerciseActions & {
  workout: ActiveWorkout | null;
  rest: Rest | null;
  // Exercises picked as replacements, newest first, for the picker's suggestions.
  swaps: string[];
  noteSwap: (exerciseId: string) => void;
  begin: (workout: ActiveWorkout) => void;
  end: () => void;
  setRestState: (rest: Rest | null) => void;
};

export const useWorkout = create<WorkoutStore>()(
  persist(
    (set) => ({
      workout: null,
      rest: null,
      swaps: [],
      noteSwap: (id) =>
        set((s) => ({ swaps: [id, ...s.swaps.filter((x) => x !== id)].slice(0, 20) })),
      begin: (workout) => set({ workout, rest: null }),
      end: () => set({ workout: null, rest: null }),
      setRestState: (rest) => set({ rest }),
      ...exerciseActions((fn) =>
        set((s) =>
          s.workout ? { workout: { ...s.workout, exercises: fn(s.workout.exercises) } } : s,
        ),
      ),
    }),
    {
      name: 'active-workout',
      storage: createJSONStorage(() => Storage),
      partialize: (s) => ({ workout: s.workout, rest: s.rest, swaps: s.swaps }),
    },
  ),
);

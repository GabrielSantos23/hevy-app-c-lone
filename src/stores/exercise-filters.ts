import { create } from 'zustand';

import type { Equipment, Muscle } from '@/db/schema';

type ExerciseFilters = {
  search: string;
  muscle: Muscle | null;
  equipment: Equipment | null;
  setSearch: (search: string) => void;
  setMuscle: (muscle: Muscle | null) => void;
  setEquipment: (equipment: Equipment | null) => void;
  clear: () => void;
};

export const useExerciseFilters = create<ExerciseFilters>()((set) => ({
  search: '',
  muscle: null,
  equipment: null,
  setSearch: (search) => set({ search }),
  setMuscle: (muscle) => set({ muscle }),
  setEquipment: (equipment) => set({ equipment }),
  clear: () => set({ muscle: null, equipment: null }),
}));

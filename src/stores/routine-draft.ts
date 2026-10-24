import { create } from 'zustand';

import { type DraftExercise, type ExerciseActions, exerciseActions } from './exercise-draft';

export type Draft = {
  routineId: string | null;
  folderId: string | null;
  name: string;
  notes: string;
  exercises: DraftExercise[];
};

type DraftStore = ExerciseActions & {
  draft: Draft | null;
  dirty: boolean;
  start: (draft: Draft) => void;
  clear: () => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
};

export const useRoutineDraft = create<DraftStore>()((set) => {
  const edit = (fn: (d: Draft) => Draft) =>
    set((s) => (s.draft ? { draft: fn(s.draft), dirty: true } : s));

  return {
    draft: null,
    dirty: false,
    start: (draft) => set({ draft, dirty: false }),
    clear: () => set({ draft: null, dirty: false }),
    setName: (name) => edit((d) => ({ ...d, name })),
    setNotes: (notes) => edit((d) => ({ ...d, notes })),
    ...exerciseActions((fn) => edit((d) => ({ ...d, exercises: fn(d.exercises) }))),
  };
});

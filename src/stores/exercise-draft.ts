import type { ExerciseType, Muscle, SetType } from '@/db/schema';

export type DraftSet = {
  key: string;
  setType: SetType;
  weight: string;
  reps: string;
  duration: string;
  distance: string;
  custom: string;
  rpe: string;
  done: boolean;
  doneAt: number | null;
  repsHint?: string;
};

export type DraftExercise = {
  key: string;
  exerciseId: string;
  name: string;
  namePt: string | null;
  type: ExerciseType;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  bodyweightFactor: number;
  restSeconds: number;
  supersetGroup: number | null;
  notes: string;
  sets: DraftSet[];
};

export type PickedExercise = Pick<
  DraftExercise,
  | 'exerciseId'
  | 'name'
  | 'namePt'
  | 'type'
  | 'primaryMuscle'
  | 'secondaryMuscles'
  | 'bodyweightFactor'
>;

export type SetPatch = Partial<Omit<DraftSet, 'key'>>;

export type ExerciseActions = {
  addExercises: (picked: PickedExercise[], restSeconds: number) => void;
  removeExercise: (key: string) => void;
  replaceExercise: (key: string, picked: PickedExercise) => void;
  moveExercise: (key: string, delta: -1 | 1) => void;
  toggleSuperset: (key: string) => void;
  setRest: (key: string, restSeconds: number) => void;
  setExerciseNotes: (key: string, notes: string) => void;
  addSet: (key: string) => void;
  removeSet: (key: string, setKey: string) => void;
  updateSet: (key: string, setKey: string, patch: SetPatch) => void;
  cycleSetType: (key: string, setKey: string) => void;
};

const setTypeCycle: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];

let counter = 0;
export const draftKey = () => `k${Date.now().toString(36)}${++counter}`;

export const emptySet = (): DraftSet => ({
  key: draftKey(),
  setType: 'normal',
  weight: '',
  reps: '',
  duration: '',
  distance: '',
  custom: '',
  rpe: '',
  done: false,
  doneAt: null,
});

export function normalizeSupersets(exercises: DraftExercise[]): DraftExercise[] {
  let group = 0;
  return exercises.map((e, i) => {
    const g = e.supersetGroup;
    const linkedPrev = g !== null && exercises[i - 1]?.supersetGroup === g;
    const linkedNext = g !== null && exercises[i + 1]?.supersetGroup === g;
    if (!linkedPrev && !linkedNext) return g === null ? e : { ...e, supersetGroup: null };
    if (!linkedPrev) group++;
    return g === group ? e : { ...e, supersetGroup: group };
  });
}

const valueFields = ['weight', 'reps', 'duration', 'distance', 'custom'] as const;

// Later sets still holding the old value were never edited by hand, so they follow the change.
export function carryForward(sets: DraftSet[], setKey: string, patch: SetPatch): DraftSet[] {
  const i = sets.findIndex((s) => s.key === setKey);
  if (i < 0) return sets;
  const before = sets[i];
  return sets.map((s, j) => {
    if (j === i) return { ...s, ...patch };
    if (j < i || s.done) return s;
    let next = s;
    for (const f of valueFields) {
      const value = patch[f];
      if (value !== undefined && s[f] === before[f]) next = { ...next, [f]: value };
    }
    return next;
  });
}

export function exerciseActions(
  editList: (fn: (list: DraftExercise[]) => DraftExercise[]) => void,
): ExerciseActions {
  const editExercises = (fn: (list: DraftExercise[]) => DraftExercise[]) =>
    editList((list) => normalizeSupersets(fn(list)));
  const editExercise = (key: string, fn: (e: DraftExercise) => DraftExercise) =>
    editExercises((list) => list.map((e) => (e.key === key ? fn(e) : e)));
  const editSet = (key: string, setKey: string, fn: (s: DraftSet) => DraftSet) =>
    editExercise(key, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.key === setKey ? fn(s) : s)),
    }));

  return {
    addExercises: (picked, restSeconds) =>
      editExercises((list) => [
        ...list,
        ...picked.map((p) => ({
          ...p,
          key: draftKey(),
          restSeconds,
          supersetGroup: null,
          notes: '',
          sets: [emptySet()],
        })),
      ]),
    removeExercise: (key) => editExercises((list) => list.filter((e) => e.key !== key)),
    // Keeps the set count and types, but the old values belong to the old exercise.
    replaceExercise: (key, picked) =>
      editExercise(key, (e) => ({
        ...e,
        ...picked,
        key: draftKey(),
        notes: '',
        sets: e.sets.map((s) => ({ ...emptySet(), setType: s.setType })),
      })),
    moveExercise: (key, delta) =>
      editExercises((list) => {
        const i = list.findIndex((e) => e.key === key);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= list.length) return list;
        const next = [...list];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }),
    toggleSuperset: (key) =>
      editExercises((list) => {
        const i = list.findIndex((e) => e.key === key);
        if (i < 0) return list;
        const current = list[i];
        if (current.supersetGroup !== null)
          return list.map((e) => (e.key === key ? { ...e, supersetGroup: null } : e));
        const nextItem = list[i + 1];
        if (!nextItem) return list;
        const group =
          nextItem.supersetGroup ?? Math.max(0, ...list.map((e) => e.supersetGroup ?? 0)) + 1;
        return list.map((e, idx) =>
          idx === i ||
          idx === i + 1 ||
          (e.supersetGroup === nextItem.supersetGroup && e.supersetGroup !== null)
            ? { ...e, supersetGroup: group }
            : e,
        );
      }),
    setRest: (key, restSeconds) => editExercise(key, (e) => ({ ...e, restSeconds })),
    setExerciseNotes: (key, notes) => editExercise(key, (e) => ({ ...e, notes })),
    addSet: (key) =>
      editExercise(key, (e) => {
        const last = e.sets.at(-1);
        return {
          ...e,
          sets: [
            ...e.sets,
            last
              ? { ...last, key: draftKey(), setType: 'normal', done: false, doneAt: null }
              : emptySet(),
          ],
        };
      }),
    removeSet: (key, setKey) =>
      editExercise(key, (e) => ({ ...e, sets: e.sets.filter((s) => s.key !== setKey) })),
    updateSet: (key, setKey, patch) =>
      editExercise(key, (e) => ({ ...e, sets: carryForward(e.sets, setKey, patch) })),
    cycleSetType: (key, setKey) =>
      editSet(key, setKey, (s) => ({
        ...s,
        setType: setTypeCycle[(setTypeCycle.indexOf(s.setType) + 1) % setTypeCycle.length],
      })),
  };
}

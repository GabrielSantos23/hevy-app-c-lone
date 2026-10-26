import type { Muscle } from '@/db/schema';

// Things to compare a workout with. Weights in kg, durations in seconds.
export const volumeObjects = {
  dog: 30,
  washingMachine: 75,
  motorcycle: 200,
  piano: 300,
  horse: 500,
  cow: 700,
  car: 1500,
  van: 2500,
  bus: 12000,
  fireTruck: 18000,
} as const;
export const liftObjects = { cat: 4, dog: 30, washingMachine: 75, motorcycle: 200 } as const;
export const timeObjects = { song: 210, episode: 1320, match: 5400 } as const;

export type FactInput = {
  volumeKg: number;
  heaviestKg: number;
  durationS: number;
  topMuscle: { muscle: Muscle; sets: number } | null;
};

export type Fact =
  | { id: string; kind: 'volume'; object: keyof typeof volumeObjects; times: number }
  | { id: string; kind: 'heaviest'; object: keyof typeof liftObjects; times: number }
  | { id: string; kind: 'duration'; object: keyof typeof timeObjects; times: number }
  | { id: string; kind: 'muscle'; muscle: Muscle; sets: number };

// "1.4 cars" reads as one car; past that, whole numbers.
const roundTimes = (x: number) => (x < 1.5 ? 1 : Math.round(x));

const options = <K extends string>(objects: Record<K, number>, amount: number) =>
  (Object.entries(objects) as [K, number][])
    .map(([object, size]) => ({ object, times: amount / size }))
    .filter((o) => o.times >= 1 && o.times <= 100);

// Up to `count` facts of different kinds, preferring comparisons not shown recently.
export function pickFacts(
  input: FactInput,
  recent: string[],
  count = 3,
  random: () => number = Math.random,
): Fact[] {
  // Each object shows once per summary: no "2 dogs" next to "16 dogs".
  const used = new Set<string>();
  const pick = <T extends { id: string; object: string }>(list: T[]) => {
    const unused = list.filter((x) => !used.has(x.object));
    const fresh = unused.filter((x) => !recent.includes(x.id));
    const from = fresh.length ? fresh : unused;
    const chosen = from.length ? from[Math.floor(random() * from.length)] : null;
    if (chosen) used.add(chosen.object);
    return chosen;
  };
  const kinds: (Fact | null)[] = [
    pick(
      options(volumeObjects, input.volumeKg).map((o) => ({
        id: `volume:${o.object}`,
        kind: 'volume' as const,
        object: o.object,
        times: roundTimes(o.times),
      })),
    ),
    pick(
      options(liftObjects, input.heaviestKg).map((o) => ({
        id: `heaviest:${o.object}`,
        kind: 'heaviest' as const,
        object: o.object,
        times: roundTimes(o.times),
      })),
    ),
    pick(
      options(timeObjects, input.durationS).map((o) => ({
        id: `duration:${o.object}`,
        kind: 'duration' as const,
        object: o.object,
        times: roundTimes(o.times),
      })),
    ),
    input.topMuscle && {
      id: `muscle:${input.topMuscle.muscle}`,
      kind: 'muscle',
      ...input.topMuscle,
    },
  ];
  const available = kinds.filter((f): f is Fact => f !== null);
  // Shuffle so the kinds show up in a different order each time.
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count);
}

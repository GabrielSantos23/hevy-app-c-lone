import type { Muscle } from '@/db/schema';

export const SUGGESTION_LIMIT = 7;

type Ranked = { id: string; name: string; primaryMuscle: Muscle };

// Recent swaps first, then what the user does most, then exercises with a demo, then by name.
export function rankSuggestions<T extends Ranked>(
  candidates: T[],
  {
    muscles,
    exclude,
    swaps,
    usage,
    hasMedia,
  }: {
    muscles: ReadonlySet<Muscle>;
    exclude: ReadonlySet<string>;
    swaps: string[];
    usage: ReadonlyMap<string, number>;
    hasMedia: (id: string) => boolean;
  },
): T[] {
  const swapRank = (id: string) => {
    const i = swaps.indexOf(id);
    return i < 0 ? Infinity : i;
  };
  return candidates
    .filter((c) => muscles.has(c.primaryMuscle) && !exclude.has(c.id))
    .sort(
      (a, b) =>
        swapRank(a.id) - swapRank(b.id) ||
        (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) ||
        Number(hasMedia(b.id)) - Number(hasMedia(a.id)) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, SUGGESTION_LIMIT);
}

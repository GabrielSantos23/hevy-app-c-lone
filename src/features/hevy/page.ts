import type { HevyRoutine } from './routines';

// Reads the text of a public hevy.com/routine page: an exercise name, then
// "3 sets · 6–12 reps", then "Rest 2min 0s" (the words follow the page language).
const SETS = /^(\d+)\s+\S+\s*·\s*(\d+)(?:\s*[–-]\s*(\d+))?/;
const REST = /^\D*(?:(\d+)\s*min)?\s*(?:(\d+)\s*s)?\s*$/;

export function parseRoutinePage(title: string, text: string): HevyRoutine {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const exercises: HevyRoutine['exercises'] = [];
  lines.forEach((line, i) => {
    const sets = SETS.exec(line);
    if (!sets || i === 0) return;
    const [, count, low, high] = sets;
    const rest = REST.exec(lines[i + 1] ?? '');
    const restSeconds =
      rest && (rest[1] || rest[2]) ? Number(rest[1] ?? 0) * 60 + Number(rest[2] ?? 0) : null;
    const ranged = high !== undefined && high !== low;
    exercises.push({
      title: lines[i - 1],
      rest_seconds: restSeconds,
      notes: null,
      superset_id: null,
      sets: Array.from({ length: Number(count) }, () => ({
        type: 'normal',
        weight_kg: null,
        reps: ranged ? null : Number(low),
        rep_range: ranged ? { start: Number(low), end: Number(high) } : null,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
      })),
    });
  });
  return { title: title.trim(), folder_id: null, exercises };
}

export const routineUrl = (input: string) => {
  const m = input.match(/hevy\.com\/routine\/([A-Za-z0-9_-]+)/i);
  return m ? `https://hevy.com/routine/${m[1]}` : null;
};

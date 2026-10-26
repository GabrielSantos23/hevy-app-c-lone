import { draftField, setFields } from '@/features/exercises/fields';
import { type UnitPrefs, toDraftSet } from '@/features/routines/convert';

import type { WorkoutSummary } from './data';

export const reportPeriods = { week: 7, month: 30, year: 365 } as const;
export type ReportPeriod = keyof typeof reportPeriods;

export type ReportText = {
  title: string;
  date: (ms: number) => string;
  duration: (seconds: number) => string;
  volume: (kg: number) => string;
  exerciseName: (e: WorkoutSummary['exercises'][number]) => string;
  setLabel: (setType: string) => string;
};

export function workoutsInPeriod(workouts: WorkoutSummary[], period: ReportPeriod, now: number) {
  const since = now - reportPeriods[period] * 86_400_000;
  return workouts.filter((w) => w.startedAt >= since);
}

// Plain text that reads well in a .txt file and in a chat.
export function workoutReport(workouts: WorkoutSummary[], units: UnitPrefs, text: ReportText) {
  const lines = [text.title, ''];
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    lines.push(
      `## ${w.name} · ${text.date(w.startedAt)} · ${text.duration(w.durationS)} · ${text.volume(w.volume)}`,
    );
    if (w.notes) lines.push(w.notes);
    for (const e of w.exercises) {
      const sets = e.sets.map((s) => {
        const draft = toDraftSet(
          { ...s, repMin: null, repMax: null },
          units,
          e.type === 'short_distance_weight',
        );
        const value = setFields[e.type]
          .map((f) =>
            f === 'weight' && draft.weight
              ? `${draft.weight} ${units.weightUnit}`
              : draft[draftField[f]],
          )
          .filter(Boolean)
          .join(' × ');
        const label = s.setType === 'normal' ? '' : `${text.setLabel(s.setType)} `;
        return `${label}${value}${s.rpe ? ` @${s.rpe}` : ''}`;
      });
      lines.push(`- ${text.exerciseName(e)}: ${sets.join(', ')}`);
      if (e.notes) lines.push(`  ${e.notes}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

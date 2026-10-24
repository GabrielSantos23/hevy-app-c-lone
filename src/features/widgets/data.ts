import type { Preferences } from '@/stores/preferences';

import { startOfWeek } from '../stats/calc';

type WeekStart = Preferences['weekStart'];

export type WidgetWorkout = { startedAt: number; volume: number };
export type WidgetRoutine = { id: string; name: string };

export type WidgetInput = {
  workouts: WidgetWorkout[];
  routines: WidgetRoutine[];
  weekStart: WeekStart;
  weightUnit: Preferences['weightUnit'];
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export type DayDot = { label: string; day: number; done: boolean; today: boolean };

export type VolumeProps = {
  title: string;
  value: string;
  caption: string;
  bars: { label: string; ratio: number; today: boolean }[];
};
export type CalendarProps = {
  title: string;
  weekdays: string[];
  weeks: number[][];
  done: number[];
  today: number;
};
export type WeekProps = { title: string; caption: string; days: DayDot[] };
export type StreakProps = { title: string; value: number; unit: string };
export type StartProps = {
  caption: string;
  label: string;
  url: string;
  routinesTitle: string;
  empty: string;
  routines: { name: string; url: string }[];
};

export type WidgetProps = {
  volume: VolumeProps;
  calendar: CalendarProps;
  week: WeekProps;
  streak: StreakProps;
  start: StartProps;
};

export const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const addDays = (ms: number, n: number) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

export function lastDays(starts: number[], now: number, count = 7) {
  const today = startOfDay(now);
  const done = new Set(starts.map(startOfDay));
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(today, i - count + 1);
    return { day, done: done.has(day), today: day === today };
  });
}

export function volumeByDay(workouts: WidgetWorkout[], now: number, count = 7) {
  const days = lastDays([], now, count).map((d) => d.day);
  return days.map((day) =>
    workouts.filter((w) => startOfDay(w.startedAt) === day).reduce((sum, w) => sum + w.volume, 0),
  );
}

export function streakWeeks(starts: number[], now: number, weekStart: WeekStart) {
  const weeks = new Set(starts.map((s) => startOfWeek(s, weekStart)));
  let week = startOfWeek(now, weekStart);
  if (!weeks.has(week)) week = startOfWeek(addDays(week, -1), weekStart);
  let count = 0;
  while (weeks.has(week)) {
    count++;
    week = startOfWeek(addDays(week, -1), weekStart);
  }
  return count;
}

export function monthGrid(now: number, weekStart: WeekStart) {
  const d = new Date(now);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const length = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() - (weekStart === 'monday' ? 1 : 0) + 7) % 7;
  const cells = [...Array<number>(lead).fill(0), ...Array.from({ length }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(0);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export const compactNumber = (value: number, locale: string) =>
  value >= 10_000
    ? `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })}k`
    : Math.round(value).toLocaleString(locale);

export function widgetProps(input: WidgetInput, now: number): WidgetProps {
  const { workouts, routines, weekStart, weightUnit, locale, t } = input;
  const factor = weightUnit === 'lb' ? 2.2046226218 : 1;
  const starts = workouts.map((w) => w.startedAt);
  const narrow = (ms: number) => new Date(ms).toLocaleDateString(locale, { weekday: 'narrow' });
  const week = lastDays(starts, now);
  const volumes = volumeByDay(workouts, now);
  const max = Math.max(...volumes, 1);
  const date = new Date(now);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
  const firstWeekday = startOfWeek(now, weekStart);
  const streak = streakWeeks(starts, now, weekStart);

  return {
    volume: {
      title: t('widgets.volume'),
      value: `${compactNumber(volumes.reduce((a, b) => a + b, 0) * factor, locale)} ${weightUnit}`,
      caption: t('widgets.last7Days'),
      bars: week.map((d, i) => ({ label: narrow(d.day), ratio: volumes[i] / max, today: d.today })),
    },
    calendar: {
      title: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      weekdays: Array.from({ length: 7 }, (_, i) => narrow(addDays(firstWeekday, i))),
      weeks: monthGrid(now, weekStart),
      done: [
        ...new Set(
          starts
            .filter((s) => s >= monthStart && s < monthEnd)
            .map((s) => new Date(s).getDate()),
        ),
      ],
      today: date.getDate(),
    },
    week: {
      title: t('widgets.workouts', { count: week.filter((d) => d.done).length }),
      caption: t('widgets.last7Days'),
      days: week.map((d) => ({
        label: narrow(d.day),
        day: new Date(d.day).getDate(),
        done: d.done,
        today: d.today,
      })),
    },
    streak: {
      title: t('widgets.streak'),
      value: streak,
      unit: t('widgets.weeks', { count: streak }),
    },
    start: {
      caption: t('widgets.quickAccess'),
      label: t('widgets.logWorkout'),
      url: 'repforge://train?start=empty',
      routinesTitle: t('widgets.routines'),
      empty: t('widgets.noRoutines'),
      routines: routines
        .slice(0, 4)
        .map((r) => ({ name: r.name, url: `repforge://train?start=${encodeURIComponent(r.id)}` })),
    },
  };
}

export function widgetTimeline(input: WidgetInput, now: number, days = 7) {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const at = i === 0 ? now : addDays(today, i);
    return { date: new Date(at), props: widgetProps(input, at) };
  });
}

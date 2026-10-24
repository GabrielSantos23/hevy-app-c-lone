import { requireOptionalNativeModule } from 'expo';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { AppState } from 'react-native';

import i18n from '@/i18n';
import type { DraftExercise } from '@/stores/exercise-draft';
import { usePreferences } from '@/stores/preferences';
import { useWorkout } from '@/stores/workout';

import { toDraftSet } from '../routines/convert';
import { routineList, routineTables } from '../routines/data';
import { historyTables, workoutSummaries } from '../stats/data';
import { completeSet, setHints } from '../workouts/complete-set';
import { previousSets } from '../workouts/data';
import { adjustRest, stopRest } from '../workouts/rest-timer';
import { activityProps, nextSet } from './activity';
import { widgetTimeline, type WidgetProps } from './data';

type Widgets = typeof import('./home-widgets').widgets;
type Activity = typeof import('./workout-activity').workoutActivity;
type Instance = ReturnType<Activity['start']>;

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);

function refreshWidgets(widgets: Widgets) {
  const prefs = usePreferences.getState();
  const timeline = widgetTimeline(
    {
      workouts: workoutSummaries(prefs.bodyWeightKg, prefs.countWarmupsInVolume),
      routines: routineList().routines,
      weekStart: prefs.weekStart,
      weightUnit: prefs.weightUnit,
      locale: i18n.language,
      t,
    },
    Date.now(),
  );
  const entries = <K extends keyof WidgetProps>(key: K) =>
    timeline.map((e) => ({ date: e.date, props: e.props[key] }));
  widgets.volume.updateTimeline(entries('volume'));
  widgets.calendar.updateTimeline(entries('calendar'));
  widgets.week.updateTimeline(entries('week'));
  widgets.streak.updateTimeline(entries('streak'));
  widgets.start.updateTimeline(entries('start'));
}

function activitySync(
  activity: Activity,
  addUserInteractionListener: typeof import('expo-widgets').addUserInteractionListener,
) {
  let instance: Instance | null = activity.getInstances()[0] ?? null;
  let last = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previous = { key: '', sets: {} as ReturnType<typeof previousSets> };

  const hints = (entry: DraftExercise, index: number) => {
    const { workout } = useWorkout.getState();
    const prefs = usePreferences.getState();
    const ids = workout?.exercises.map((e) => e.exerciseId) ?? [];
    const routine = prefs.previousValuesMode === 'routine' ? (workout?.routineId ?? null) : null;
    const key = `${routine}|${ids.join()}`;
    if (key !== previous.key) previous = { key, sets: previousSets(ids, routine) };
    const prev = previous.sets[entry.exerciseId]?.[index];
    const units = { weightUnit: prefs.weightUnit, distanceUnit: prefs.distanceUnit };
    const draft = prev ? toDraftSet(prev, units, entry.type === 'short_distance_weight') : null;
    return setHints(draft, entry.sets[index]);
  };

  const context = () => {
    const prefs = usePreferences.getState();
    return {
      units: { weightUnit: prefs.weightUnit, distanceUnit: prefs.distanceUnit },
      exerciseName: (e: DraftExercise) =>
        i18n.language === 'pt-BR' && e.namePt ? e.namePt : e.name,
      hints,
      t,
    };
  };

  const sync = () => {
    clearTimeout(timer);
    const { workout, rest } = useWorkout.getState();
    if (!workout) {
      instance?.end('immediate').catch(() => undefined);
      instance = null;
      last = '';
      return;
    }
    if (rest && rest.endsAt > Date.now()) timer = setTimeout(sync, rest.endsAt - Date.now() + 500);
    const props = activityProps(workout, rest, context());
    const json = JSON.stringify(props);
    if (json === last) return;
    last = json;
    try {
      if (instance) instance.update(props).catch(() => undefined);
      else instance = activity.start(props, 'repforge://workout');
    } catch {
      instance = null;
    }
  };

  addUserInteractionListener(({ source, target }) => {
    if (source !== 'WorkoutActivity') return;
    if (target === 'rest-minus') adjustRest(-15);
    else if (target === 'rest-plus') adjustRest(15);
    else if (target === 'rest-skip') stopRest();
    else if (target === 'complete-set') {
      const { workout } = useWorkout.getState();
      const next = workout && nextSet(workout);
      if (next) completeSet(next.entry.key, next.set.key, hints(next.entry, next.index));
    }
  });
  useWorkout.subscribe(sync);
  usePreferences.subscribe(sync);
  i18n.on('languageChanged', sync);
  sync();
}

let started = false;

export function startWidgetSync() {
  if (started || !requireOptionalNativeModule('ExpoWidgets')) return;
  started = true;
  const { widgets } = require('./home-widgets') as typeof import('./home-widgets');
  const { workoutActivity } = require('./workout-activity') as typeof import('./workout-activity');

  let pending: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      try {
        refreshWidgets(widgets);
      } catch {}
    }, 1500);
  };
  const tables = [...historyTables, ...routineTables];
  addDatabaseChangeListener(({ tableName }) => {
    if (tables.includes(tableName)) schedule();
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') schedule();
  });
  usePreferences.subscribe(schedule);
  i18n.on('languageChanged', schedule);
  schedule();
  activitySync(
    workoutActivity,
    (require('expo-widgets') as typeof import('expo-widgets')).addUserInteractionListener,
  );
}

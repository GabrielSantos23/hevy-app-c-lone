import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'phosphor-react-native';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useDbQuery } from '@/db/use-db-query';
import { useExerciseName } from '@/features/exercises/display';
import { draftField, setFields } from '@/features/exercises/fields';
import { ExerciseThumb } from '@/features/exercises/media';
import { HealthSection } from '@/features/health/health-section';
import { toDraftSet } from '@/features/routines/convert';
import { scanRecords } from '@/features/stats/calc';
import {
  deleteWorkout,
  exerciseSessions,
  historyTables,
  muscleSplit,
  type WorkoutExerciseDetail,
  workoutSummaries,
} from '@/features/stats/data';
import { useWorkoutFormat } from '@/features/stats/workout-card';
import { BodyMap } from '@/features/workouts/body-map';
import { formatDurationWords } from '@/features/workouts/stats';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const format = useWorkoutFormat();
  const prefs = usePreferences();
  const summary = useDbQuery(
    useCallback(
      () => workoutSummaries(prefs.bodyWeightKg, prefs.countWarmupsInVolume, [id])[0],
      [id, prefs.bodyWeightKg, prefs.countWarmupsInVolume],
    ),
    historyTables,
  );

  const prSetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of summary?.exercises ?? [])
      for (const setId of scanRecords(exerciseSessions(e.exerciseId), e.type, prefs.oneRmFormula)
        .prSetIds)
        ids.add(setId);
    return ids;
  }, [summary, prefs.oneRmFormula]);

  if (!summary) return null;

  const muscles = muscleSplit(summary.exercises);
  const records = summary.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => prSetIds.has(s.id)).length,
    0,
  );

  const confirmDelete = () =>
    Alert.alert(t('history.deleteTitle'), t('history.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteWorkout(summary.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: summary.name, headerLargeTitle: false }} />
      <View className="gap-6 pb-10 pt-2">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-3">
            <Text className="font-regular text-footnote text-muted-foreground">
              {format.date(summary.startedAt)}
            </Text>
            <View className="flex-row flex-wrap gap-x-6 gap-y-2">
              <Stat label={t('workout.duration')} value={formatDurationWords(summary.durationS)} />
              <Stat label={t('workout.volume')} value={format.volume(summary.volume)} />
              <Stat label={t('workout.sets')} value={String(summary.sets)} />
              <Stat label={t('history.records')} value={String(records)} />
            </View>
          </View>
          <BodyMap sets={muscles} height={90} />
        </View>
        {summary.notes ? (
          <Text className="font-regular text-body text-foreground">{summary.notes}</Text>
        ) : null}
        <HealthSection workoutId={summary.id} />
        {summary.exercises.map((e) => (
          <ExerciseBlock key={e.entryId} entry={e} prSetIds={prSetIds} />
        ))}
        <Button label={t('history.delete')} variant="destructive" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function ExerciseBlock({
  entry,
  prSetIds,
}: {
  entry: WorkoutExerciseDetail;
  prSetIds: Set<string>;
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const displayName = useExerciseName();
  const weightUnit = usePreferences((s) => s.weightUnit);
  const distanceUnit = usePreferences((s) => s.distanceUnit);
  const fields = setFields[entry.type];
  let normal = 0;

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        <ExerciseThumb exerciseId={entry.exerciseId} />
        <Text className="flex-1 font-semibold text-headline text-primary-text">
          {displayName(entry)}
        </Text>
      </View>
      {entry.notes ? (
        <Text className="font-regular text-callout text-muted-foreground">{entry.notes}</Text>
      ) : null}
      {entry.sets.map((s) => {
        const label =
          s.setType === 'normal'
            ? String(++normal)
            : t(`setTypes.${s.setType}Short` as 'setTypes.warmupShort');
        const draft = toDraftSet(
          { ...s, repMin: null, repMax: null },
          { weightUnit, distanceUnit },
          entry.type === 'short_distance_weight',
        );
        const value = fields
          .map((f) =>
            f === 'weight' && draft.weight ? `${draft.weight} ${weightUnit}` : draft[draftField[f]],
          )
          .filter(Boolean)
          .join(' × ');
        const pr = prSetIds.has(s.id);
        return (
          <View
            key={s.id}
            accessible
            accessibilityLabel={`${t('routineEditor.set')} ${label}: ${value}${pr ? `, ${t('history.pr')}` : ''}`}
            className="min-h-touch flex-row items-center gap-4 rounded-md bg-surface px-3"
          >
            <Text className="w-6 font-semibold text-callout text-muted-foreground">{label}</Text>
            <Text className="flex-1 font-medium text-body text-foreground">{value}</Text>
            {pr ? <Trophy size={18} weight="fill" color={hex(scheme, 'warning')} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="font-regular text-caption text-muted-foreground">{label}</Text>
      <Text className="font-semibold text-callout text-foreground">{value}</Text>
    </View>
  );
}

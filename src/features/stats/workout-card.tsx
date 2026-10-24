import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useExerciseName } from '@/features/exercises/display';
import { ExerciseThumb } from '@/features/exercises/media';
import { formatDurationWords } from '@/features/workouts/stats';
import { formatWeight } from '@/lib/units';
import { usePreferences } from '@/stores/preferences';

import type { WorkoutSummary } from './data';

const SHOWN = 3;

export function useWorkoutFormat() {
  const { i18n } = useTranslation();
  const weightUnit = usePreferences((s) => s.weightUnit);
  return {
    date: (ms: number) =>
      new Date(ms).toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    volume: (kg: number) =>
      `${Number(formatWeight(kg, weightUnit)).toLocaleString(i18n.language)} ${weightUnit}`,
  };
}

export function WorkoutCard({
  summary,
  onPress,
}: {
  summary: WorkoutSummary;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const displayName = useExerciseName();
  const format = useWorkoutFormat();
  const rest = summary.exercises.length - SHOWN;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="gap-3 rounded-lg border border-border bg-surface p-4 active:bg-surface-raised"
    >
      <View className="gap-0.5">
        <Text numberOfLines={1} className="font-semibold text-headline text-foreground">
          {summary.name}
        </Text>
        <Text className="font-regular text-footnote text-muted-foreground">
          {format.date(summary.startedAt)}
        </Text>
      </View>
      <View className="flex-row gap-6">
        <Stat label={t('workout.duration')} value={formatDurationWords(summary.durationS)} />
        <Stat label={t('workout.volume')} value={format.volume(summary.volume)} />
        <Stat label={t('workout.sets')} value={String(summary.sets)} />
      </View>
      <View className="gap-2">
        {summary.exercises.slice(0, SHOWN).map((e) => (
          <View key={e.entryId} className="flex-row items-center gap-3">
            <ExerciseThumb exerciseId={e.exerciseId} />
            <Text numberOfLines={1} className="flex-1 font-regular text-callout text-foreground">
              {t('history.setsOf', { count: e.sets.length, name: displayName(e) })}
            </Text>
          </View>
        ))}
        {rest > 0 ? (
          <Text className="font-medium text-footnote text-muted-foreground">
            {t('history.moreExercises', { count: rest })}
          </Text>
        ) : null}
      </View>
    </Pressable>
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

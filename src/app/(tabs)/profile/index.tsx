import { router, Stack } from 'expo-router';
import { CaretRight, FileCsv, Heartbeat, Ruler } from 'phosphor-react-native';
import { type ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Chip } from '@/components/ui/chip';
import type { Muscle } from '@/db/schema';
import { useDbQuery } from '@/db/use-db-query';
import { type WeekBucket, weeklyBuckets } from '@/features/stats/calc';
import { historyTables, muscleSplit, workoutSummaries } from '@/features/stats/data';
import { useWorkoutFormat } from '@/features/stats/workout-card';
import { BodyMap } from '@/features/workouts/body-map';
import { formatDurationWords } from '@/features/workouts/stats';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

const WEEKS = 12;
const MUSCLE_DAYS = 30;
const metrics = ['workouts', 'durationS', 'volume', 'reps'] as const;
type Metric = (typeof metrics)[number];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const format = useWorkoutFormat();
  const prefs = usePreferences();
  const [metric, setMetric] = useState<Metric>('workouts');
  const workouts = useDbQuery(
    useCallback(
      () => workoutSummaries(prefs.bodyWeightKg, prefs.countWarmupsInVolume),
      [prefs.bodyWeightKg, prefs.countWarmupsInVolume],
    ),
    historyTables,
  );
  const [now] = useState(Date.now);
  const buckets = weeklyBuckets(workouts, WEEKS, prefs.weekStart, now);
  const values = buckets.map((b: WeekBucket) => b[metric]);

  const formatMetric = (v: number) =>
    metric === 'durationS'
      ? formatDurationWords(v)
      : metric === 'volume'
        ? format.volume(v)
        : String(Math.round(v));
  const week = (ms: number) =>
    new Date(ms).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  const since = now - MUSCLE_DAYS * 86_400_000;
  const muscles = muscleSplit(
    workouts.filter((x) => x.startedAt >= since).flatMap((w) => w.exercises),
  );
  const topMuscles = (Object.entries(muscles) as [Muscle, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('profile.title') }} />
      <View className="gap-6 pb-10 pt-2">
        <View className="flex-row gap-3">
          <Summary label={t('profile.totalWorkouts')} value={String(workouts.length)} />
          <Summary label={t('profile.thisWeek')} value={String(buckets.at(-1)?.workouts ?? 0)} />
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
            {t('profile.lastWeeks', { count: WEEKS })}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {metrics.map((m) => (
              <Chip
                key={m}
                label={t(`profile.metrics.${m}`)}
                selected={metric === m}
                onPress={() => setMetric(m)}
              />
            ))}
          </View>
          <View className="rounded-lg bg-surface p-4">
            <BarChart
              values={values}
              labels={[
                week(buckets[0].start),
                week(buckets[WEEKS / 2].start),
                week(buckets[WEEKS - 1].start),
              ]}
              height={140}
              format={formatMetric}
              summary={t('profile.chartSummary', {
                metric: t(`profile.metrics.${metric}`),
                count: WEEKS,
                total: formatMetric(values.reduce((a, b) => a + b, 0)),
                latest: formatMetric(values.at(-1) ?? 0),
              })}
            />
          </View>
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
            {t('profile.muscles', { count: MUSCLE_DAYS })}
          </Text>
          <View className="items-center gap-4 rounded-lg bg-surface p-4">
            <BodyMap sets={muscles} height={180} />
            {topMuscles.length ? (
              <View className="self-stretch">
                {topMuscles.map(([m, n]) => (
                  <View key={m} className="min-h-touch flex-row items-center justify-between">
                    <Text className="font-regular text-body text-foreground">
                      {t(`muscles.${m}`)}
                    </Text>
                    <Text className="font-semibold text-body text-foreground">
                      {t('workout.setCount', { count: n })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-center font-regular text-callout text-muted-foreground">
                {t('profile.musclesEmpty')}
              </Text>
            )}
          </View>
        </View>

        <View className="overflow-hidden rounded-lg bg-surface">
          <LinkRow
            icon={<Ruler size={22} color={hex(scheme, 'primary-text')} />}
            label={t('measurements.title')}
            onPress={() => router.push('/profile/measurements')}
          />
          <LinkRow
            icon={<FileCsv size={22} color={hex(scheme, 'primary-text')} />}
            label={t('data.title')}
            onPress={() => router.push('/profile/data')}
            last={Platform.OS !== 'ios'}
          />
          {Platform.OS === 'ios' ? (
            <LinkRow
              icon={<Heartbeat size={22} color={hex(scheme, 'primary-text')} />}
              label={t('health.title')}
              onPress={() => router.push('/profile/health')}
              last
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View accessible className="flex-1 gap-1 rounded-lg bg-surface p-4">
      <Text className="font-regular text-footnote text-muted-foreground">{label}</Text>
      <Text className="font-bold text-title-1 text-foreground">{value}</Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const scheme = useScheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-log flex-row items-center gap-3 px-4 active:bg-surface-raised ${last ? '' : 'border-b border-border'}`}
    >
      {icon}
      <Text className="flex-1 font-medium text-body text-foreground">{label}</Text>
      <CaretRight size={18} color={hex(scheme, 'muted-foreground')} />
    </Pressable>
  );
}

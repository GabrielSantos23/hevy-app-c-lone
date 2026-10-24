import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import type { ExerciseType, RecordKind } from '@/db/schema';
import { useDbQuery } from '@/db/use-db-query';
import { formatDurationWords } from '@/features/workouts/stats';
import { formatDistanceKm, formatWeight } from '@/lib/units';
import { usePreferences } from '@/stores/preferences';

import { recordKindsFor, recordValue, scanRecords } from './calc';
import { exerciseSessions, historyTables } from './data';

const WEIGHT_KINDS: RecordKind[] = ['best_weight', 'best_volume', 'best_1rm'];

export function ExerciseProgress({ exerciseId, type }: { exerciseId: string; type: ExerciseType }) {
  const { t, i18n } = useTranslation();
  const prefs = usePreferences();
  const sessions = useDbQuery(
    useCallback(() => exerciseSessions(exerciseId), [exerciseId]),
    historyTables,
  );
  if (!sessions.length) return null;

  const kinds = recordKindsFor(type);
  const chartKind = kinds[type === 'weight_reps' ? 1 : 0];
  const { bests } = scanRecords(sessions, type, prefs.oneRmFormula);

  const formatKind = (kind: RecordKind, v: number) =>
    WEIGHT_KINDS.includes(kind)
      ? `${formatWeight(v, prefs.weightUnit)} ${prefs.weightUnit}`
      : kind === 'best_duration'
        ? formatDurationWords(v)
        : kind === 'best_distance'
          ? `${formatDistanceKm(v, prefs.distanceUnit)} ${prefs.distanceUnit}`
          : String(Math.round(v));

  const points = sessions.map((s) =>
    Math.max(
      0,
      ...s.sets
        .filter((x) => x.setType !== 'warmup')
        .map((x) => recordValue(chartKind, x, prefs.oneRmFormula) ?? 0),
    ),
  );
  const day = (ms: number) =>
    new Date(ms).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  const latest = points.at(-1) ?? 0;

  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
        {t('progress.title')}
      </Text>
      <View className="gap-2 rounded-lg bg-surface p-4">
        <Text className="font-medium text-callout text-foreground">
          {t(`progress.kinds.${chartKind}`)}
        </Text>
        <LineChart
          points={points}
          labels={[day(sessions[0].startedAt), day(sessions.at(-1)!.startedAt)]}
          height={140}
          format={(v) => formatKind(chartKind, v)}
          summary={t('progress.chartSummary', {
            metric: t(`progress.kinds.${chartKind}`),
            count: sessions.length,
            latest: formatKind(chartKind, latest),
            best: formatKind(chartKind, Math.max(...points)),
          })}
        />
      </View>
      <View className="overflow-hidden rounded-lg bg-surface">
        {kinds.map((kind, i) => {
          const best = bests[kind];
          return (
            <View
              key={kind}
              className={`min-h-touch flex-row items-center justify-between gap-4 px-4 py-3 ${
                i < kinds.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <Text className="font-regular text-body text-muted-foreground">
                {t(`progress.kinds.${kind}`)}
              </Text>
              <View className="items-end">
                <Text className="font-semibold text-body text-foreground">
                  {best ? formatKind(kind, best.value) : '–'}
                </Text>
                {best ? (
                  <Text className="font-regular text-caption text-muted-foreground">
                    {day(best.at)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

import { CaretDown, CaretUp, Medal } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Chip } from '@/components/ui/chip';
import type { ExerciseType, RecordKind } from '@/db/schema';
import { formatDurationWords } from '@/features/workouts/stats';
import { formatDistanceKm, formatWeight } from '@/lib/units';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { recordKindsFor, recordValue, scanRecords, type Session } from './calc';

const WEIGHT_KINDS: RecordKind[] = ['best_weight', 'best_volume', 'best_1rm'];

export function ExerciseProgress({ sessions, type }: { sessions: Session[]; type: ExerciseType }) {
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const prefs = usePreferences();
  const kinds = recordKindsFor(type);
  const [chartKind, setChartKind] = useState(kinds[0]);
  const [setRecordsOpen, setSetRecordsOpen] = useState(false);
  if (!sessions.length) return null;

  const { bests } = scanRecords(sessions, type, prefs.oneRmFormula);
  const weight = (kg: number) => `${formatWeight(kg, prefs.weightUnit)} ${prefs.weightUnit}`;
  const formatKind = (kind: RecordKind, v: number) =>
    WEIGHT_KINDS.includes(kind)
      ? weight(v)
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

  // Heaviest weight lifted for each rep count, like Hevy's "Set records".
  const byReps = new Map<number, number>();
  if (kinds.includes('best_weight'))
    for (const s of sessions)
      for (const x of s.sets)
        if (x.setType !== 'warmup' && x.reps && x.weightKg)
          byReps.set(x.reps, Math.max(byReps.get(x.reps) ?? 0, x.weightKg));
  const setRecords = [...byReps].sort((a, b) => a[0] - b[0]);

  return (
    <View className="gap-6">
      <View className="gap-3">
        <View className="flex-row items-baseline gap-2">
          <Text className="font-semibold text-title-2 text-foreground">
            {formatKind(chartKind, latest)}
          </Text>
          <Text className="font-regular text-body text-primary-text">
            {day(sessions.at(-1)!.startedAt)}
          </Text>
        </View>
        <LineChart
          points={points}
          labels={[day(sessions[0].startedAt), day(sessions.at(-1)!.startedAt)]}
          height={160}
          format={(v) => formatKind(chartKind, v)}
          summary={t('progress.chartSummary', {
            metric: t(`progress.kinds.${chartKind}`),
            count: sessions.length,
            latest: formatKind(chartKind, latest),
            best: formatKind(chartKind, Math.max(...points)),
          })}
        />
        {kinds.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {kinds.map((kind) => (
                <Chip
                  key={kind}
                  label={t(`progress.kinds.${kind}`)}
                  selected={kind === chartKind}
                  onPress={() => setChartKind(kind)}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View>
        <View className="flex-row items-center gap-2 pb-1">
          <Medal size={22} weight="fill" color={hex(scheme, 'warning')} />
          <Text accessibilityRole="header" className="font-medium text-body text-muted-foreground">
            {t('progress.records')}
          </Text>
        </View>
        {kinds.map((kind) => {
          const best = bests[kind];
          return (
            <View
              key={kind}
              className="min-h-touch flex-row items-center justify-between gap-4 border-b border-border py-3"
            >
              <Text className="font-regular text-body text-foreground">
                {t(`progress.kinds.${kind}`)}
              </Text>
              <Text className="font-medium text-body text-primary-text">
                {best ? formatKind(kind, best.value) : '–'}
              </Text>
            </View>
          );
        })}
      </View>

      {setRecords.length ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: setRecordsOpen }}
            onPress={() => setSetRecordsOpen(!setRecordsOpen)}
            className="min-h-touch flex-row items-center justify-between"
          >
            <Text
              accessibilityRole="header"
              className="font-medium text-body text-muted-foreground"
            >
              {t('progress.setRecords')}
            </Text>
            {setRecordsOpen ? (
              <CaretUp size={18} color={hex(scheme, 'muted-foreground')} />
            ) : (
              <CaretDown size={18} color={hex(scheme, 'muted-foreground')} />
            )}
          </Pressable>
          {setRecordsOpen ? (
            <>
              <View className="flex-row py-2">
                <Text className="w-24 font-semibold text-body text-foreground">
                  {t('progress.reps')}
                </Text>
                <Text className="font-semibold text-body text-foreground">
                  {t('progress.personalBest')}
                </Text>
              </View>
              {setRecords.map(([reps, kg]) => (
                <View
                  key={reps}
                  className="min-h-touch flex-row items-center border-b border-border"
                >
                  <Text className="w-24 font-regular text-body text-foreground">{reps}</Text>
                  <Text className="font-regular text-body text-foreground">{weight(kg)}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { useDbQuery } from '@/db/use-db-query';

import { getWatchData, watchTables } from './data';

export function WatchSection({ workoutId }: { workoutId: string }) {
  const { t, i18n } = useTranslation();
  const data = useDbQuery(
    useCallback(() => getWatchData(workoutId), [workoutId]),
    watchTables,
  );
  if (!data) return null;

  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const samples = data.hrSamples ?? [];

  return (
    <View className="gap-3 rounded-lg bg-surface p-4">
      <Text accessibilityRole="header" className="font-semibold text-headline text-foreground">
        {t('watch.title')}
      </Text>
      <View className="flex-row flex-wrap gap-x-6 gap-y-2">
        <Metric
          label={t('watch.calories')}
          value={data.activeEnergyKcal === null ? '–' : `${Math.round(data.activeEnergyKcal)} kcal`}
        />
        <Metric
          label={t('watch.avgHr')}
          value={data.avgHr === null ? '–' : `${Math.round(data.avgHr)} bpm`}
        />
        <Metric
          label={t('watch.maxHr')}
          value={data.maxHr === null ? '–' : `${Math.round(data.maxHr)} bpm`}
        />
      </View>
      {samples.length > 1 ? (
        <LineChart
          points={samples.map(([, bpm]) => bpm)}
          labels={[time(samples[0][0]), time(samples[samples.length - 1][0])]}
          height={96}
          summary={t('watch.hrSummary', {
            avg: Math.round(data.avgHr ?? 0),
            max: Math.round(data.maxHr ?? 0),
          })}
          format={(v) => `${Math.round(v)} bpm`}
        />
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="font-regular text-caption text-muted-foreground">{label}</Text>
      <Text className="font-semibold text-callout text-foreground">{value}</Text>
    </View>
  );
}

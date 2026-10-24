import { router, Stack } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useDbQuery } from '@/db/use-db-query';
import { lengthFields, listMeasurements, measurementTables } from '@/features/measurements/data';
import { formatWeight } from '@/lib/units';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function MeasurementsScreen() {
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const weightUnit = usePreferences((s) => s.weightUnit);
  const items = useDbQuery(listMeasurements, measurementTables);
  const weights = items.filter((m) => m.weightKg !== null).reverse();
  const day = (ms: number) =>
    new Date(ms).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const weight = (kg: number) => `${formatWeight(kg, weightUnit)} ${weightUnit}`;
  const add = () => router.push('/measurement/form');

  return (
    <Screen>
      <Stack.Screen options={{ title: t('measurements.title'), headerLargeTitle: false }} />
      {items.length === 0 ? (
        <EmptyState
          title={t('measurements.emptyTitle')}
          body={t('measurements.emptyBody')}
          action={<Button label={t('measurements.add')} size="lg" onPress={add} />}
        />
      ) : (
        <View className="gap-6 pb-10 pt-2">
          <Button label={t('measurements.add')} onPress={add} />
          {weights.length ? (
            <View className="gap-2 rounded-lg bg-surface p-4">
              <Text className="font-medium text-callout text-foreground">
                {t('measurements.weight', { unit: weightUnit })}
              </Text>
              <LineChart
                points={weights.map((m) => m.weightKg!)}
                labels={[day(weights[0].measuredAt), day(weights.at(-1)!.measuredAt)]}
                height={140}
                format={weight}
                summary={t('measurements.chartSummary', {
                  count: weights.length,
                  latest: weight(weights.at(-1)!.weightKg!),
                })}
              />
            </View>
          ) : null}
          <View className="overflow-hidden rounded-lg bg-surface">
            {items.map((m, i) => {
              const sites = lengthFields.filter((f) => m[f] !== null).length;
              const parts = [
                m.weightKg !== null ? weight(m.weightKg) : null,
                m.fatPercent !== null ? `${m.fatPercent}%` : null,
                sites ? t('measurements.siteCount', { count: sites }) : null,
              ].filter(Boolean);
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/measurement/form', params: { id: m.id } })
                  }
                  className={`min-h-log flex-row items-center gap-3 px-4 py-3 active:bg-surface-raised ${
                    i < items.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="flex-1 gap-0.5">
                    <Text className="font-medium text-body text-foreground">
                      {day(m.measuredAt)}
                    </Text>
                    <Text className="font-regular text-footnote text-muted-foreground">
                      {parts.join(' · ')}
                    </Text>
                  </View>
                  <CaretRight size={18} color={hex(scheme, 'muted-foreground')} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </Screen>
  );
}

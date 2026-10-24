import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useDbQuery } from '@/db/use-db-query';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { getLink, healthTables, linkWorkout, sessionFor, takenUuids, unlinkWorkout } from './data';
import { fetchHealthDetails, fetchHealthWorkouts, healthSupported } from './healthkit';
import { candidates, MIN_COVERAGE, NEARBY_MS } from './match';

type Candidate = ReturnType<typeof candidates>[number];

export function HealthSection({ workoutId }: { workoutId: string }) {
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const enabled = usePreferences((s) => s.healthSync);
  const link = useDbQuery(
    useCallback(() => getLink(workoutId), [workoutId]),
    healthTables,
  );
  const [picker, setPicker] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);

  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const activity = (type: string) =>
    t(`health.activity.${type}`, { defaultValue: t('health.activity.other') });

  const openPicker = async () => {
    const session = sessionFor(workoutId);
    if (!session) return;
    setLoading(true);
    const health = await fetchHealthWorkouts(
      session.start - NEARBY_MS,
      session.end + NEARBY_MS,
    ).catch(() => []);
    setLoading(false);
    setPicker(candidates(session, health, takenUuids(workoutId)));
  };

  const choose = async (c: Candidate) => {
    setPicker(null);
    const details = await fetchHealthDetails(c.uuid).catch(() => null);
    linkWorkout(workoutId, c, details, 'manual');
  };

  const confirmUnlink = () =>
    Alert.alert(t('health.unlinkTitle'), t('health.unlinkBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('health.unlink'), style: 'destructive', onPress: () => unlinkWorkout(workoutId) },
    ]);

  if (Platform.OS !== 'ios') return null;

  if (link)
    return (
      <View className="gap-3 rounded-lg bg-surface p-4">
        <View className="gap-0.5">
          <Text accessibilityRole="header" className="font-semibold text-headline text-foreground">
            {t('health.title')}
          </Text>
          <Text className="font-regular text-footnote text-muted-foreground">
            {`${activity(link.activityType)} · ${time(link.hkStart)}–${time(link.hkEnd)}`}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-x-6 gap-y-2">
          <Metric
            label={t('health.calories')}
            value={
              link.activeEnergyKcal === null ? '–' : `${Math.round(link.activeEnergyKcal)} kcal`
            }
          />
          <Metric
            label={t('health.avgHr')}
            value={link.avgHr === null ? '–' : `${Math.round(link.avgHr)} bpm`}
          />
          <Metric
            label={t('health.maxHr')}
            value={link.maxHr === null ? '–' : `${Math.round(link.maxHr)} bpm`}
          />
        </View>
        {link.hrSamples && link.hrSamples.length > 1 ? (
          <LineChart
            points={link.hrSamples.map(([, bpm]) => bpm)}
            labels={[
              time(link.hrSamples[0][0]),
              time(link.hrSamples[link.hrSamples.length - 1][0]),
            ]}
            height={96}
            summary={t('health.hrSummary', {
              avg: Math.round(link.avgHr ?? 0),
              max: Math.round(link.maxHr ?? 0),
            })}
            format={(v) => `${Math.round(v)} bpm`}
          />
        ) : null}
        <Button label={t('health.unlink')} variant="tonal-destructive" onPress={confirmUnlink} />
      </View>
    );

  if (!enabled || !healthSupported()) return null;

  return (
    <>
      {loading ? (
        <View className="min-h-touch flex-row items-center justify-center gap-3">
          <ActivityIndicator color={hex(scheme, 'primary-text')} />
          <Text className="font-medium text-body text-foreground">{t('health.searching')}</Text>
        </View>
      ) : (
        <Button label={t('health.link')} variant="secondary" onPress={openPicker} />
      )}
      <Sheet
        title={t('health.pickTitle')}
        visible={picker !== null}
        onClose={() => setPicker(null)}
      >
        {picker?.length ? (
          <View className="gap-2">
            {picker.map((c) => (
              <Pressable
                key={c.uuid}
                accessibilityRole="button"
                onPress={() => choose(c)}
                className="min-h-log justify-center gap-0.5 rounded-md bg-surface px-4 py-3 active:bg-surface-raised"
              >
                <Text className="font-semibold text-body text-foreground">
                  {`${activity(c.activityType)} · ${time(c.start)}–${time(c.end)}`}
                </Text>
                <Text className="font-regular text-footnote text-muted-foreground">
                  {[
                    c.source,
                    c.coverage >= MIN_COVERAGE
                      ? t('health.overlaps', { percent: Math.round(c.coverage * 100) })
                      : c.coverage > 0
                        ? t('health.partly', { percent: Math.round(c.coverage * 100) })
                        : t('health.apart', { minutes: Math.round(c.distance / 60_000) }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="font-regular text-body text-muted-foreground">{t('health.none')}</Text>
        )}
      </Sheet>
    </>
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

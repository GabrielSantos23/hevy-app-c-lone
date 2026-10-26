import { Stack } from 'expo-router';
import { File } from 'expo-file-system';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useDbQuery } from '@/db/use-db-query';
import {
  detectCsv,
  parseCsv,
  parseHevyMeasurements,
  parseHevyWorkouts,
  parseStrong,
} from '@/features/csv/csv';
import {
  exportMeasurements,
  exportWorkouts,
  importMeasurements,
  importTables,
  importWorkouts,
  listImports,
  undoImport,
} from '@/features/csv/data';
import { useHevyRoutineImport } from '@/features/hevy/import-routine';
import { widgetStatus } from '@/features/widgets/sync';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { healthProbe } from '../../../../modules/health-probe';

export default function DataScreen() {
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const { weightUnit, distanceUnit, lengthUnit } = usePreferences();
  const units = { weightUnit, distanceUnit, lengthUnit };
  const imports = useDbQuery(listImports, importTables);
  const [busy, setBusy] = useState(false);
  const hevy = useHevyRoutineImport();

  const fail = (e: unknown) =>
    Alert.alert(t('data.errorTitle'), e instanceof Error ? e.message : String(e));

  const pick = async () => {
    try {
      const picked = await File.pickFileAsync({
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain'],
      });
      if (picked.canceled) return;
      const file = picked.result;
      const fileName = /\.\w+$/.test(file.name) ? file.name : t('data.unnamedFile');
      const rows = parseCsv(await file.text());
      const kind = detectCsv(rows);
      if (!kind) {
        Alert.alert(t('data.unknownTitle'), t('data.unknownBody'));
        return;
      }
      const workouts =
        kind === 'hevy-workouts'
          ? parseHevyWorkouts(rows)
          : kind === 'strong'
            ? parseStrong(rows)
            : [];
      const measurements = kind === 'hevy-measurements' ? parseHevyMeasurements(rows) : [];
      Alert.alert(
        t('data.confirmTitle'),
        kind === 'hevy-measurements'
          ? t('data.confirmMeasurements', { count: measurements.length, file: fileName })
          : t('data.confirmWorkouts', {
              count: workouts.length,
              app: kind === 'strong' ? 'Strong' : 'Hevy',
              file: fileName,
            }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('data.import'),
            onPress: () => {
              setBusy(true);
              setTimeout(() => {
                try {
                  const r =
                    kind === 'hevy-measurements'
                      ? importMeasurements(measurements, fileName)
                      : importWorkouts(workouts, kind === 'strong' ? 'strong' : 'hevy', fileName);
                  Alert.alert(
                    t('data.doneTitle'),
                    kind === 'hevy-measurements'
                      ? t('data.doneMeasurements', { count: r.measurements, skipped: r.skipped })
                      : t('data.doneWorkouts', {
                          count: r.workouts,
                          sets: r.sets,
                          created: r.exercisesCreated,
                          skipped: r.skipped,
                        }),
                  );
                } catch (e) {
                  fail(e);
                } finally {
                  setBusy(false);
                }
              }, 50);
            },
          },
        ],
      );
    } catch (e) {
      fail(e);
    }
  };

  const confirmUndo = (id: string, name: string) =>
    Alert.alert(t('data.undoTitle', { name }), t('data.undoBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('data.undo'), style: 'destructive', onPress: () => undoImport(id) },
    ]);

  const run = (task: () => Promise<void>) => () => task().catch(fail);
  const widgets = widgetStatus();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('data.title'), headerLargeTitle: false }} />
      <View className="gap-8 pb-10 pt-2">
        <Section title={t('data.importTitle')} body={t('data.importBody')}>
          {busy ? (
            <View className="min-h-log flex-row items-center justify-center gap-3">
              <ActivityIndicator color={hex(scheme, 'primary-text')} />
              <Text className="font-medium text-body text-foreground">{t('data.importing')}</Text>
            </View>
          ) : (
            <Button label={t('data.pick')} size="lg" onPress={pick} />
          )}
        </Section>

        <Section title={t('data.hevyTitle')} body={t('data.hevyBody')}>
          <Button
            label={t('data.hevyImport')}
            size="lg"
            disabled={busy || hevy.reading}
            onPress={hevy.open}
          />
        </Section>
        {hevy.element}

        {imports.length ? (
          <Section title={t('data.historyTitle')}>
            <View className="overflow-hidden rounded-lg bg-surface">
              {imports.map((b, i) => (
                <View
                  key={b.id}
                  className={`flex-row items-center gap-3 px-4 py-3 ${i < imports.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <View className="flex-1 gap-0.5">
                    <Text numberOfLines={1} className="font-medium text-body text-foreground">
                      {b.fileName}
                    </Text>
                    <Text className="font-regular text-footnote text-muted-foreground">
                      {new Date(b.importedAt).toLocaleDateString(i18n.language)} ·{' '}
                      {b.measurementsCount
                        ? t('data.measurementCount', { count: b.measurementsCount })
                        : t('data.workoutCount', { count: b.workoutsCount })}
                    </Text>
                  </View>
                  <Button
                    label={t('data.undo')}
                    variant="destructive"
                    accessibilityLabel={t('data.undoLabel', { name: b.fileName })}
                    onPress={() => confirmUndo(b.id, b.fileName)}
                  />
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title={t('data.exportTitle')} body={t('data.exportBody')}>
          <Button
            label={t('data.exportWorkouts')}
            variant="secondary"
            onPress={run(() => exportWorkouts(units))}
          />
          <Button
            label={t('data.exportMeasurements')}
            variant="secondary"
            onPress={run(() => exportMeasurements(units))}
          />
        </Section>

        {healthProbe ? (
          <Section title={t('data.healthTitle')} body={t('data.healthBody')}>
            <Button
              label={t('data.healthTest')}
              variant="secondary"
              onPress={() =>
                healthProbe
                  ?.probe()
                  .then((r) => Alert.alert(t('data.healthTitle'), r))
                  .catch(fail)
              }
            />
          </Section>
        ) : null}

        {widgets ? (
          <Section title={t('data.widgetsTitle')} body={t('data.widgetsBody')}>
            <Text selectable className="font-regular text-footnote text-muted-foreground">
              {widgets}
            </Text>
          </Section>
        ) : null}
      </View>
    </Screen>
  );
}

function Section({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
        {title}
      </Text>
      {body ? <Text className="font-regular text-body text-muted-foreground">{body}</Text> : null}
      {children}
    </View>
  );
}

import { router, Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { useDbQuery } from '@/db/use-db-query';
import { historyTables, workoutSummaries } from '@/features/stats/data';
import { dayKey, MonthCalendar } from '@/features/stats/month-calendar';
import { WorkoutCard } from '@/features/stats/workout-card';
import { usePreferences } from '@/stores/preferences';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const bodyWeightKg = usePreferences((s) => s.bodyWeightKg);
  const countWarmups = usePreferences((s) => s.countWarmupsInVolume);
  const weekStart = usePreferences((s) => s.weekStart);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const workouts = useDbQuery(
    useCallback(() => workoutSummaries(bodyWeightKg, countWarmups), [bodyWeightKg, countWarmups]),
    historyTables,
  );
  const workoutDays = new Set(workouts.map((w) => dayKey(w.startedAt)));

  return (
    <>
      <Stack.Screen options={{ title: t('history.title') }} />
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerClassName="gap-3 px-4 pb-10"
        initialNumToRender={4}
        windowSize={7}
        ListHeaderComponent={
          workouts.length ? (
            <View className="pb-3 pt-2">
              <MonthCalendar
                month={month}
                workoutDays={workoutDays}
                weekStart={weekStart}
                onChangeMonth={(delta) =>
                  setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
                }
              />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState title={t('history.emptyTitle')} body={t('history.emptyBody')} />
        }
        renderItem={({ item }) => (
          <WorkoutCard
            summary={item}
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}
          />
        )}
      />
    </>
  );
}

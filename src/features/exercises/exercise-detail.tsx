import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import type { ExerciseType } from '@/db/schema';
import { useDbQuery } from '@/db/use-db-query';
import { useExerciseName } from '@/features/exercises/display';
import { draftField, setFields } from '@/features/exercises/fields';
import { ExerciseAnimation } from '@/features/exercises/media';
import { deleteExercise } from '@/features/exercises/mutations';
import { exerciseByIdQuery } from '@/features/exercises/queries';
import { toDraftSet } from '@/features/routines/convert';
import type { Session } from '@/features/stats/calc';
import { exerciseSessions, historyTables } from '@/features/stats/data';
import { ExerciseProgress } from '@/features/stats/exercise-progress';
import { usePreferences } from '@/stores/preferences';

type Tab = 'summary' | 'history' | 'howTo';

export function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const displayName = useExerciseName();
  const [tab, setTab] = useState<Tab>('summary');
  const query = useMemo(() => exerciseByIdQuery(id), [id]);
  const { data } = useLiveQuery(query, [id]);
  const sessions = useDbQuery(
    useCallback(() => exerciseSessions(id), [id]),
    historyTables,
  );
  const item = data?.[0];

  if (!item) return <Stack.Screen options={{ title: '', headerShown: true }} />;
  const name = displayName(item);

  const confirmDelete = () =>
    Alert.alert(t('exerciseDetail.deleteTitle'), t('exerciseDetail.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('exerciseDetail.delete'),
        style: 'destructive',
        onPress: () => {
          deleteExercise(item.id);
          router.back();
        },
      },
    ]);

  const tabs: [Tab, string][] = [
    ['summary', t('exerciseDetail.summary')],
    ['history', t('exerciseDetail.history')],
    ['howTo', t('exerciseDetail.instructions')],
  ];
  const animation = (
    <ExerciseAnimation exerciseId={item.id} label={t('exerciseDetail.animation', { name })} />
  );
  const heading = (
    <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
      {name}
    </Text>
  );

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: name,
          headerShown: true,
          headerLargeTitle: false,
          headerRight: item.isCustom
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/exercise/form', params: { id: item.id } })
                  }
                  className="min-h-touch justify-center px-2"
                >
                  <Text className="font-semibold text-headline text-primary-text">
                    {t('exerciseDetail.edit')}
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <View accessibilityRole="tablist" className="-mx-4 mb-4 flex-row border-b border-border">
        {tabs.map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            className={`min-h-touch flex-1 items-center justify-center border-b-2 ${
              tab === key ? 'border-primary' : 'border-transparent'
            }`}
          >
            <Text
              className={`font-medium text-body ${
                tab === key ? 'text-primary-text' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'summary' ? (
        <View className="gap-6">
          {animation}
          <View className="gap-1">
            {heading}
            <Text className="font-regular text-body text-muted-foreground">
              {t('exerciseDetail.primary', { muscle: t(`muscles.${item.primaryMuscle}`) })}
            </Text>
            {item.secondaryMuscles.length ? (
              <Text className="font-regular text-body text-muted-foreground">
                {t('exerciseDetail.secondary', {
                  muscles: item.secondaryMuscles.map((m) => t(`muscles.${m}`)).join(', '),
                })}
              </Text>
            ) : null}
            <Text className="font-regular text-body text-muted-foreground">
              {t(`equipment.${item.equipment}`)} · {t(`exerciseTypes.${item.type}`)}
            </Text>
          </View>
          <ExerciseProgress sessions={sessions} type={item.type} />
          {item.isCustom ? (
            <Button
              label={t('exerciseDetail.delete')}
              variant="destructive"
              onPress={confirmDelete}
            />
          ) : null}
        </View>
      ) : tab === 'history' ? (
        <History sessions={sessions} type={item.type} />
      ) : (
        <View className="gap-6">
          {animation}
          {heading}
          {item.instructions ? (
            item.instructions.split('\n').map((step, i) => (
              <View key={i} className="flex-row gap-3">
                <Text className="w-6 font-semibold text-body text-foreground">{i + 1}.</Text>
                <Text className="flex-1 font-regular text-body text-foreground">{step}</Text>
              </View>
            ))
          ) : (
            <Text className="font-regular text-body text-muted-foreground">
              {t('exerciseDetail.noInstructions')}
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}

function History({ sessions, type }: { sessions: Session[]; type: ExerciseType }) {
  const { t, i18n } = useTranslation();
  const weightUnit = usePreferences((s) => s.weightUnit);
  const distanceUnit = usePreferences((s) => s.distanceUnit);
  if (!sessions.length)
    return (
      <Text className="py-8 text-center font-regular text-body text-muted-foreground">
        {t('exerciseDetail.noHistory')}
      </Text>
    );
  const fields = setFields[type];
  return (
    <View className="gap-8">
      {[...sessions].reverse().map((session) => {
        let normal = 0;
        return (
          <View key={session.workoutId} className="gap-2">
            <View>
              <Text className="font-semibold text-headline text-foreground">{session.name}</Text>
              <Text className="font-regular text-footnote text-muted-foreground">
                {new Date(session.startedAt).toLocaleString(i18n.language, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            </View>
            {session.sets.map((s, i) => {
              const label =
                s.setType === 'normal'
                  ? String(++normal)
                  : t(`setTypes.${s.setType}Short` as 'setTypes.warmupShort');
              const draft = toDraftSet(
                { ...s, rpe: null, repMin: null, repMax: null },
                { weightUnit, distanceUnit },
                type === 'short_distance_weight',
              );
              const value = fields
                .map((f) =>
                  f === 'weight' && draft.weight
                    ? `${draft.weight} ${weightUnit}`
                    : draft[draftField[f]],
                )
                .filter(Boolean)
                .join(' × ');
              return (
                <View
                  key={s.id}
                  accessible
                  accessibilityLabel={`${t('routineEditor.set')} ${label}: ${value}`}
                  className={`min-h-touch flex-row items-center gap-4 rounded-md px-3 ${
                    i % 2 ? '' : 'bg-surface'
                  }`}
                >
                  <Text
                    className={`w-6 font-semibold text-callout ${
                      s.setType === 'warmup' ? 'text-warning' : 'text-foreground'
                    }`}
                  >
                    {label}
                  </Text>
                  <Text className="flex-1 font-medium text-body text-foreground">{value}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

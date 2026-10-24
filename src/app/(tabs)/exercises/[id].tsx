import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useExerciseName } from '@/features/exercises/display';
import { deleteExercise } from '@/features/exercises/mutations';
import { ExerciseAnimation } from '@/features/exercises/media';
import { exerciseByIdQuery } from '@/features/exercises/queries';
import { ExerciseProgress } from '@/features/stats/exercise-progress';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const displayName = useExerciseName();
  const query = useMemo(() => exerciseByIdQuery(id), [id]);
  const { data } = useLiveQuery(query, [id]);
  const item = data?.[0];

  if (!item) return <Stack.Screen options={{ title: '' }} />;

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

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: displayName(item),
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
      <View className="gap-6 pt-4">
        <ExerciseAnimation
          exerciseId={item.id}
          label={t('exerciseDetail.animation', { name: displayName(item) })}
        />
        <View className="overflow-hidden rounded-lg bg-surface">
          <Fact
            label={t('exerciseDetail.primaryMuscle')}
            value={t(`muscles.${item.primaryMuscle}`)}
          />
          <Fact
            label={t('exerciseDetail.secondaryMuscles')}
            value={
              item.secondaryMuscles.length
                ? item.secondaryMuscles.map((m) => t(`muscles.${m}`)).join(', ')
                : t('exerciseDetail.none')
            }
          />
          <Fact label={t('exerciseDetail.equipment')} value={t(`equipment.${item.equipment}`)} />
          <Fact label={t('exerciseDetail.type')} value={t(`exerciseTypes.${item.type}`)} last />
        </View>

        <ExerciseProgress exerciseId={item.id} type={item.type} />

        {item.instructions ? (
          <View className="gap-3">
            <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
              {t('exerciseDetail.instructions')}
            </Text>
            {item.instructions.split('\n').map((step, i) => (
              <View key={i} className="flex-row gap-3">
                <Text className="w-6 font-semibold text-body text-muted-foreground">{i + 1}.</Text>
                <Text className="flex-1 font-regular text-body text-foreground">{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.isCustom ? (
          <Button
            label={t('exerciseDetail.delete')}
            variant="destructive"
            onPress={confirmDelete}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function Fact({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`min-h-touch flex-row items-center justify-between gap-4 px-4 py-3 ${last ? '' : 'border-b border-border'}`}
    >
      <Text className="font-regular text-body text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right font-medium text-body text-foreground">{value}</Text>
    </View>
  );
}

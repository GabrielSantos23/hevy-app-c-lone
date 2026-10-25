import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ExerciseList } from '@/features/exercises/exercise-list';
import type { ExerciseListItem } from '@/features/exercises/queries';
import { useExerciseFilters } from '@/stores/exercise-filters';
import { usePreferences } from '@/stores/preferences';
import { useRoutineDraft } from '@/stores/routine-draft';
import { useWorkout } from '@/stores/workout';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function AddExerciseRoute() {
  const { target } = useLocalSearchParams<{ target?: 'routine' | 'workout' }>();
  return <AddExerciseScreen target={target} />;
}

function AddExerciseScreen({ target }: { target?: 'routine' | 'workout' }) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const search = useExerciseFilters((s) => s.search);
  const setSearch = useExerciseFilters((s) => s.setSearch);
  const [picked, setPicked] = useState<ExerciseListItem[]>([]);
  const selectedIds = new Set(picked.map((p) => p.id));

  useEffect(() => () => useExerciseFilters.getState().setSearch(''), []);

  const toggle = (item: ExerciseListItem) =>
    setPicked((list) =>
      list.some((p) => p.id === item.id) ? list.filter((p) => p.id !== item.id) : [...list, item],
    );

  const add = () => {
    const store = target === 'workout' ? useWorkout.getState() : useRoutineDraft.getState();
    store.addExercises(
      picked.map(
        ({ id, name, namePt, type, primaryMuscle, secondaryMuscles, bodyweightFactor }) => ({
          exerciseId: id,
          name,
          namePt,
          type,
          primaryMuscle,
          secondaryMuscles,
          bodyweightFactor,
        }),
      ),
      usePreferences.getState().defaultRestSeconds,
    );
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 px-4 pb-1 pt-4">
        <View className="flex-row items-center justify-between">
          <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
            {t('exercisePicker.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/exercise/form')}
            className="min-h-touch justify-center px-2"
          >
            <Text className="font-semibold text-body text-primary-text">
              {t('exercisePicker.create')}
            </Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel={t('exercises.searchPlaceholder')}
          placeholder={t('exercises.searchPlaceholder')}
          placeholderTextColor={hex(scheme, 'muted-foreground')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          className="min-h-touch rounded-md border border-border-strong bg-surface px-4 font-regular text-body text-foreground"
        />
      </View>
      <ExerciseList onSelect={toggle} selectedIds={selectedIds} />
      <View className="gap-2 border-t border-border bg-surface-raised px-4 pb-6 pt-3">
        {picked.length === 0 ? (
          <Text className="text-center font-regular text-footnote text-muted-foreground">
            {t('exercisePicker.none')}
          </Text>
        ) : null}
        <Button
          label={
            picked.length
              ? t('exercisePicker.add', { count: picked.length })
              : t('exercisePicker.title')
          }
          size="lg"
          disabled={picked.length === 0}
          onPress={add}
        />
      </View>
    </View>
  );
}

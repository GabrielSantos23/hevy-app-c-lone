import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { MagnifyingGlass } from 'phosphor-react-native';
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

  // Inside the list header: a formSheet hides views placed above its scroll view.
  const header = (
    <View className="gap-4 px-4 pb-1 pt-5">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="min-h-touch justify-center rounded-full bg-surface-raised px-4 active:opacity-80"
        >
          <Text className="font-medium text-body text-primary-text">{t('common.cancel')}</Text>
        </Pressable>
        <Text accessibilityRole="header" className="font-semibold text-headline text-foreground">
          {t('exercisePicker.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/exercise/form')}
          className="min-h-touch justify-center rounded-full bg-surface-raised px-4 active:opacity-80"
        >
          <Text className="font-medium text-body text-primary-text">
            {t('exercisePicker.create')}
          </Text>
        </Pressable>
      </View>
      <View className="min-h-touch flex-row items-center gap-3 rounded-md bg-surface-raised px-4">
        <MagnifyingGlass size={20} color={hex(scheme, 'muted-foreground')} />
        <TextInput
          accessibilityLabel={t('exercises.searchPlaceholder')}
          placeholder={t('exercises.searchPlaceholder')}
          placeholderTextColor={hex(scheme, 'muted-foreground')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          className="min-h-touch flex-1 font-regular text-body text-foreground"
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <ExerciseList onSelect={toggle} selectedIds={selectedIds} header={header} />
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

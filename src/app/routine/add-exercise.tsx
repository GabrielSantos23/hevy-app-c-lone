import { router, useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { MagnifyingGlass } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import type { Muscle } from '@/db/schema';
import { ExerciseList, ExerciseRow } from '@/features/exercises/exercise-list';
import type { ExerciseListItem } from '@/features/exercises/queries';
import { suggestedExercises } from '@/features/exercises/suggestions';
import { useExerciseFilters } from '@/stores/exercise-filters';
import { usePreferences } from '@/stores/preferences';
import { useRoutineDraft } from '@/stores/routine-draft';
import { useWorkout } from '@/stores/workout';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

type Params = { target?: 'routine' | 'workout'; replace?: string };

export default function AddExerciseRoute() {
  const { target, replace } = useLocalSearchParams<Params>();
  return <AddExerciseScreen target={target} replace={replace} />;
}

const toPicked = ({
  id,
  name,
  namePt,
  type,
  primaryMuscle,
  secondaryMuscles,
  bodyweightFactor,
}: ExerciseListItem) => ({
  exerciseId: id,
  name,
  namePt,
  type,
  primaryMuscle,
  secondaryMuscles,
  bodyweightFactor,
});

// replace: key of the exercise being swapped; picking one replaces it right away.
function AddExerciseScreen({ target, replace }: Params) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const search = useExerciseFilters((s) => s.search);
  const setSearch = useExerciseFilters((s) => s.setSearch);
  const [picked, setPicked] = useState<ExerciseListItem[]>([]);
  const selectedIds = new Set(picked.map((p) => p.id));
  const store = () => (target === 'workout' ? useWorkout.getState() : useRoutineDraft.getState());
  const current =
    target === 'workout' ? useWorkout.getState().workout : useRoutineDraft.getState().draft;
  const replacing = current?.exercises.find((e) => e.key === replace);

  useLayoutEffect(() => {
    const filters = useExerciseFilters.getState();
    if (replacing) filters.setMuscle(replacing.primaryMuscle);
    return () => {
      filters.setSearch('');
      if (replacing) filters.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same muscles as the exercise being replaced, or as the workout so far.
  const suggestions = useMemo(() => {
    const exercises = current?.exercises ?? [];
    const muscles: Muscle[] = replacing
      ? [replacing.primaryMuscle]
      : [...new Set(exercises.map((e) => e.primaryMuscle))];
    return suggestedExercises(
      muscles,
      exercises.map((e) => e.exerciseId),
      useWorkout.getState().swaps,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (item: ExerciseListItem) => {
    if (replacing) {
      store().replaceExercise(replacing.key, toPicked(item));
      useWorkout.getState().noteSwap(item.id);
      router.back();
      return;
    }
    setPicked((list) =>
      list.some((p) => p.id === item.id) ? list.filter((p) => p.id !== item.id) : [...list, item],
    );
  };

  const add = () => {
    store().addExercises(picked.map(toPicked), usePreferences.getState().defaultRestSeconds);
    router.back();
  };

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
          {t(replacing ? 'exercisePicker.replaceTitle' : 'exercisePicker.title')}
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
      {header}
      <ExerciseList
        onSelect={toggle}
        selectedIds={replacing ? undefined : selectedIds}
        header={
          suggestions.length && !search ? (
            <View>
              <SectionTitle label={t('exercisePicker.suggestions')} />
              {suggestions.map((item) => (
                <ExerciseRow
                  key={item.id}
                  item={item}
                  onSelect={toggle}
                  selected={replacing ? undefined : selectedIds.has(item.id)}
                />
              ))}
              <SectionTitle label={t('exercisePicker.all')} />
            </View>
          ) : undefined
        }
      />
      {replacing ? null : (
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
      )}
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="px-4 pb-2 pt-4 font-semibold text-footnote uppercase text-muted-foreground"
    >
      {label}
    </Text>
  );
}

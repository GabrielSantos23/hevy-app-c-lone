import { router, Stack } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { ExerciseList } from '@/features/exercises/exercise-list';
import { nativeToolbar } from '@/lib/use-glass';
import { useExerciseFilters } from '@/stores/exercise-filters';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function ExercisesScreen() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const setSearch = useExerciseFilters((s) => s.setSearch);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('exercises.title'),
          headerSearchBarOptions: {
            placeholder: t('exercises.searchPlaceholder'),
            hideWhenScrolling: false,
            onChangeText: (e) => setSearch(e.nativeEvent.text),
            onCancelButtonPress: () => setSearch(''),
          },
          headerRight: nativeToolbar
            ? undefined
            : () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('exercises.create')}
                  onPress={() => router.push('/exercise/form')}
                  className="min-h-touch min-w-touch items-center justify-center"
                >
                  <Plus size={24} color={hex(scheme, 'primary-text')} weight="bold" />
                </Pressable>
              ),
        }}
      />
      {nativeToolbar ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel={t('exercises.create')}
            onPress={() => router.push('/exercise/form')}
          />
        </Stack.Toolbar>
      ) : null}
      <ExerciseList
        onSelect={(item) => router.push({ pathname: '/exercises/[id]', params: { id: item.id } })}
      />
    </>
  );
}

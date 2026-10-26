import { like } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { DotsThree } from 'phosphor-react-native';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { db } from '@/db/client';
import { type Equipment, equipments, exercise, type Muscle } from '@/db/schema';
import { BodyMap } from '@/features/workouts/body-map';
import { useExerciseFilters } from '@/stores/exercise-filters';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { ExerciseThumb, mediaFor } from './media';
import { exerciseListQuery } from './queries';

type Kind = 'equipment' | 'muscle';

const muscleGroups: [string, Muscle[]][] = [
  [
    'upperBody',
    [
      'abdominals',
      'biceps',
      'chest',
      'forearms',
      'lats',
      'lower_back',
      'neck',
      'shoulders',
      'traps',
      'triceps',
      'upper_back',
    ],
  ],
  ['lowerBody', ['abductors', 'adductors', 'calves', 'glutes', 'hamstrings', 'quadriceps']],
  ['otherGroup', ['cardio', 'full_body', 'other']],
];
const backMuscles: Muscle[] = [
  'lats',
  'lower_back',
  'traps',
  'triceps',
  'upper_back',
  'glutes',
  'hamstrings',
  'calves',
];

const seedEquipment = db
  .select({ id: exercise.id, equipment: exercise.equipment })
  .from(exercise)
  .where(like(exercise.id, 'seed:%'));

// One exercise with an animation per equipment, used as that equipment's picture.
function useEquipmentPictures() {
  const { data } = useLiveQuery(seedEquipment);
  return useMemo(() => {
    const pictures: Partial<Record<Equipment, string>> = {};
    for (const row of data ?? [])
      if (!pictures[row.equipment] && mediaFor(row.id)) pictures[row.equipment] = row.id;
    return pictures;
  }, [data]);
}

export function FilterButtons() {
  const { t } = useTranslation();
  const { muscle, equipment } = useExerciseFilters();
  const [open, setOpen] = useState<Kind | null>(null);
  const button = (kind: Kind, label: string, selected: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('exercises.filterHint')}
      onPress={() => setOpen(kind)}
      className={`min-h-touch flex-1 items-center justify-center rounded-md px-3 ${
        selected ? 'bg-primary' : 'bg-surface-raised active:opacity-80'
      }`}
    >
      <Text
        numberOfLines={1}
        className={`font-medium text-body ${selected ? 'text-on-primary' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <>
      <View className="flex-row gap-3 px-4 pb-3 pt-2">
        {button(
          'equipment',
          equipment ? t(`equipment.${equipment}`) : t('exercises.allEquipment'),
          equipment !== null,
        )}
        {button(
          'muscle',
          muscle ? t(`muscles.${muscle}`) : t('exercises.allMuscles'),
          muscle !== null,
        )}
      </View>
      <FilterSheet kind={open} onClose={() => setOpen(null)} />
    </>
  );
}

function FilterSheet({ kind, onClose }: { kind: Kind | null; onClose: () => void }) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const filters = useExerciseFilters();
  const pictures = useEquipmentPictures();
  const { search, muscle, equipment } = filters;
  const query = useMemo(
    () => exerciseListQuery({ search, muscle, equipment }),
    [search, muscle, equipment],
  );
  const { data } = useLiveQuery(query, [search, muscle, equipment]);

  const card = (
    key: string,
    label: string,
    selected: boolean,
    picture: ReactNode,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`min-h-log w-[48%] flex-row items-center gap-3 rounded-lg p-3 ${
        selected ? 'border-2 border-primary bg-primary/15' : 'bg-surface-raised active:opacity-80'
      }`}
    >
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white">
        {picture}
      </View>
      <Text numberOfLines={2} className="flex-1 font-medium text-body text-foreground">
        {label}
      </Text>
    </Pressable>
  );
  const other = <DotsThree size={26} weight="bold" color={hex(scheme, 'muted-foreground')} />;

  const equipmentGrid = (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {equipments.map((e) =>
        card(
          e,
          t(`equipment.${e}`),
          filters.equipment === e,
          pictures[e] ? <ExerciseThumb exerciseId={pictures[e]} /> : other,
          () => filters.setEquipment(filters.equipment === e ? null : e),
        ),
      )}
    </View>
  );
  const muscleGrid = muscleGroups.map(([group, list]) => (
    <View key={group} className="gap-3">
      <Text accessibilityRole="header" className="font-regular text-body text-muted-foreground">
        {t(`exercises.${group}` as 'exercises.upperBody')}
      </Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {list.map((m) =>
          card(
            m,
            t(`muscles.${m}`),
            filters.muscle === m,
            m === 'other' ? (
              other
            ) : (
              <BodyMap
                sets={m === 'full_body' || m === 'cardio' ? {} : { [m]: 3 }}
                height={52}
                side={backMuscles.includes(m) ? 'back' : 'front'}
              />
            ),
            () => filters.setMuscle(filters.muscle === m ? null : m),
          ),
        )}
      </View>
    </View>
  ));

  return (
    <Sheet
      title={kind === 'muscle' ? t('exercises.muscleGroup') : t('exercises.equipmentTitle')}
      visible={kind !== null}
      onClose={onClose}
    >
      <ScrollView style={{ maxHeight: 520 }} contentContainerClassName="gap-5 px-2 pb-4">
        {kind === 'muscle' ? muscleGrid : equipmentGrid}
      </ScrollView>
      <View className="flex-row gap-3 px-2 pt-2">
        <View className="flex-1">
          <Button label={t('exercises.clearFilters')} variant="secondary" onPress={filters.clear} />
        </View>
        <View className="flex-1">
          <Button
            label={t('exercises.showResults', { count: data?.length ?? 0 })}
            onPress={onClose}
          />
        </View>
      </View>
    </Sheet>
  );
}

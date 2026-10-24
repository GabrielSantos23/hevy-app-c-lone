import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text } from 'react-native';

import { equipments, muscles } from '@/db/schema';
import { useExerciseFilters } from '@/stores/exercise-filters';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function FilterSheet() {
  const { kind } = useLocalSearchParams<{ kind: 'muscle' | 'equipment' }>();
  const { t } = useTranslation();
  const scheme = useScheme();
  const filters = useExerciseFilters();
  const isMuscle = kind === 'muscle';
  const options: readonly string[] = isMuscle ? muscles : equipments;
  const current: string | null = isMuscle ? filters.muscle : filters.equipment;

  const choose = (value: string | null) => {
    if (isMuscle) filters.setMuscle(value as (typeof muscles)[number] | null);
    else filters.setEquipment(value as (typeof equipments)[number] | null);
    router.back();
  };

  const rows: { value: string | null; label: string }[] = [
    { value: null, label: t(isMuscle ? 'exercises.anyMuscle' : 'exercises.anyEquipment') },
    ...options.map((o) => ({ value: o, label: t(isMuscle ? `muscles.${o}` : `equipment.${o}`) })),
  ];

  return (
    <ScrollView className="flex-1 bg-surface-raised" contentContainerClassName="pb-8 pt-2">
      <Text
        accessibilityRole="header"
        className="px-4 pb-2 pt-4 font-semibold text-title-2 text-foreground"
      >
        {t(isMuscle ? 'exercises.filterMuscleTitle' : 'exercises.filterEquipmentTitle')}
      </Text>
      {rows.map(({ value, label }) => {
        const selected = value === current;
        return (
          <Pressable
            key={value ?? 'any'}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => choose(value)}
            className="min-h-touch flex-row items-center justify-between border-b border-border px-4 py-3 active:bg-surface"
          >
            <Text
              className={`text-body ${selected ? 'font-semibold text-primary-text' : 'font-regular text-foreground'}`}
            >
              {label}
            </Text>
            {selected ? (
              <Check size={20} color={hex(scheme, 'primary-text')} weight="bold" />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

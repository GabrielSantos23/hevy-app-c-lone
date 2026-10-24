import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  type Equipment,
  equipments,
  type ExerciseType,
  exerciseTypes,
  type Muscle,
  muscles,
} from '@/db/schema';
import { type ExerciseInput, createExercise, updateExercise } from '@/features/exercises/mutations';
import { exerciseByIdQuery } from '@/features/exercises/queries';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

const empty: ExerciseInput = {
  name: '',
  type: 'weight_reps',
  equipment: 'barbell',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
};

export default function ExerciseFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useMemo(() => exerciseByIdQuery(id ?? ''), [id]);
  const { data } = useLiveQuery(query, [id]);
  const existing = id ? data?.[0] : undefined;

  if (id && !existing) return null;
  return (
    <ExerciseForm
      id={id}
      initial={
        existing
          ? {
              name: existing.name,
              type: existing.type,
              equipment: existing.equipment,
              primaryMuscle: existing.primaryMuscle,
              secondaryMuscles: existing.secondaryMuscles,
            }
          : empty
      }
    />
  );
}

function ExerciseForm({ id, initial }: { id?: string; initial: ExerciseInput }) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const [form, setForm] = useState<ExerciseInput>(initial);
  const [showError, setShowError] = useState(false);
  const [closing, setClosing] = useState(false);

  const dirty = !closing && JSON.stringify(form) !== JSON.stringify(initial);
  const nameMissing = form.name.trim().length === 0;

  usePreventRemove(dirty, () => {
    Alert.alert(t('exerciseForm.discardTitle'), undefined, [
      { text: t('exerciseForm.keepEditing'), style: 'cancel' },
      {
        text: t('exerciseForm.discard'),
        style: 'destructive',
        onPress: () => setClosing(true),
      },
    ]);
  });

  const save = () => {
    if (nameMissing) {
      setShowError(true);
      return;
    }
    if (id) updateExercise(id, form);
    else createExercise(form);
    setClosing(true);
  };

  useEffect(() => {
    if (closing) router.back();
  }, [closing]);

  const set = <K extends keyof ExerciseInput>(key: K, value: ExerciseInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleSecondary = (m: Muscle) =>
    set(
      'secondaryMuscles',
      form.secondaryMuscles.includes(m)
        ? form.secondaryMuscles.filter((x) => x !== m)
        : [...form.secondaryMuscles, m],
    );

  return (
    <>
      <Stack.Screen
        options={{ title: t(id ? 'exerciseForm.editTitle' : 'exerciseForm.newTitle') }}
      />
      <ScrollView
        className="flex-1 bg-surface-raised"
        contentContainerClassName="gap-6 px-4 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
          {t(id ? 'exerciseForm.editTitle' : 'exerciseForm.newTitle')}
        </Text>

        <View className="gap-2">
          <Text nativeID="exercise-name" className="font-medium text-callout text-foreground">
            {t('exerciseForm.name')}
          </Text>
          <TextInput
            accessibilityLabelledBy="exercise-name"
            value={form.name}
            onChangeText={(v) => set('name', v)}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            placeholderTextColor={hex(scheme, 'muted-foreground')}
            className={`min-h-log rounded-md border bg-surface px-4 font-regular text-body text-foreground ${
              showError && nameMissing ? 'border-destructive-text' : 'border-border-strong'
            }`}
          />
          {showError && nameMissing ? (
            <Text
              accessibilityLiveRegion="polite"
              className="font-medium text-footnote text-destructive-text"
            >
              {t('exerciseForm.nameRequired')}
            </Text>
          ) : null}
        </View>

        <View accessibilityRole="radiogroup" className="gap-2">
          <Text className="font-medium text-callout text-foreground">{t('exerciseForm.type')}</Text>
          {exerciseTypes.map((o) => (
            <TypeOption
              key={o}
              type={o}
              selected={form.type === o}
              onPress={() => set('type', o)}
            />
          ))}
        </View>
        <ChoiceGroup<Equipment>
          title={t('exerciseForm.equipment')}
          options={equipments}
          isSelected={(o) => form.equipment === o}
          label={(o) => t(`equipment.${o}`)}
          onToggle={(o) => set('equipment', o)}
        />
        <ChoiceGroup<Muscle>
          title={t('exerciseForm.primaryMuscle')}
          options={muscles}
          isSelected={(o) => form.primaryMuscle === o}
          label={(o) => t(`muscles.${o}`)}
          onToggle={(o) => set('primaryMuscle', o)}
        />
        <ChoiceGroup<Muscle>
          title={t('exerciseForm.secondaryMuscles')}
          options={muscles.filter((m) => m !== form.primaryMuscle)}
          isSelected={(o) => form.secondaryMuscles.includes(o)}
          label={(o) => t(`muscles.${o}`)}
          onToggle={toggleSecondary}
        />
      </ScrollView>
      <View className="border-t border-border bg-surface-raised px-4 pb-6 pt-3">
        <Button label={t('exerciseForm.save')} size="lg" onPress={save} />
      </View>
    </>
  );
}

type ChoiceGroupProps<T extends string> = {
  title: string;
  options: readonly T[];
  isSelected: (o: T) => boolean;
  label: (o: T) => string;
  onToggle: (o: T) => void;
};

function ChoiceGroup<T extends string>({
  title,
  options,
  isSelected,
  label,
  onToggle,
}: ChoiceGroupProps<T>) {
  return (
    <View className="gap-2">
      <Text className="font-medium text-callout text-foreground">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} label={label(o)} selected={isSelected(o)} onPress={() => onToggle(o)} />
        ))}
      </View>
    </View>
  );
}

function TypeOption({
  type,
  selected,
  onPress,
}: {
  type: ExerciseType;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`min-h-log justify-center gap-0.5 rounded-md border px-4 py-2 ${
        selected ? 'border-primary-text bg-primary/15' : 'border-border-strong bg-surface'
      }`}
    >
      <Text
        className={`font-medium text-body ${selected ? 'text-primary-text' : 'text-foreground'}`}
      >
        {t(`exerciseTypes.${type}`)}
      </Text>
      <Text className="font-regular text-footnote text-muted-foreground">
        {t(`exerciseTypeExamples.${type}`)}
      </Text>
    </Pressable>
  );
}

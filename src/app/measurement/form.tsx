import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  deleteMeasurement,
  getMeasurement,
  type LengthField,
  lengthFields,
  saveMeasurement,
} from '@/features/measurements/data';
import { formatLength, formatWeight, parseLength, parseNumber, parseWeight } from '@/lib/units';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

type Field = 'weight' | 'fat' | LengthField;

export default function MeasurementForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const { weightUnit, lengthUnit } = usePreferences();
  const [existing] = useState(() => (id ? getMeasurement(id) : undefined));
  const [values, setValues] = useState<Record<Field, string>>(() => {
    const v = {
      weight: formatWeight(existing?.weightKg ?? null, weightUnit),
      fat: existing?.fatPercent != null ? String(existing.fatPercent) : '',
    } as Record<Field, string>;
    for (const f of lengthFields) v[f] = formatLength(existing?.[f] ?? null, lengthUnit);
    return v;
  });
  const [showError, setShowError] = useState(false);
  const [measuredAt] = useState(() => existing?.measuredAt ?? Date.now());

  const save = () => {
    if (Object.values(values).every((v) => parseNumber(v) === null)) {
      setShowError(true);
      return;
    }
    const lengths = Object.fromEntries(
      lengthFields.map((f) => [f, parseLength(values[f], lengthUnit)]),
    ) as Record<LengthField, number | null>;
    saveMeasurement(existing?.id ?? null, {
      measuredAt,
      weightKg: parseWeight(values.weight, weightUnit),
      fatPercent: parseNumber(values.fat),
      ...lengths,
    });
    router.back();
  };

  const remove = () =>
    Alert.alert(t('measurements.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteMeasurement(existing!.id);
          router.back();
        },
      },
    ]);

  const input = (field: Field, label: string) => (
    <View key={field} className="w-[48%] gap-1.5">
      <Text nativeID={`m-${field}`} className="font-medium text-footnote text-foreground">
        {label}
      </Text>
      <TextInput
        accessibilityLabelledBy={`m-${field}`}
        value={values[field]}
        onChangeText={(v) => setValues((s) => ({ ...s, [field]: v }))}
        keyboardType="decimal-pad"
        placeholder="–"
        placeholderTextColor={hex(scheme, 'muted-foreground')}
        className="min-h-touch rounded-md border border-border-strong bg-surface px-3 font-regular text-body text-foreground"
      />
    </View>
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-surface-raised"
        contentContainerClassName="gap-5 px-4 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="gap-1">
          <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
            {t(existing ? 'measurements.editTitle' : 'measurements.newTitle')}
          </Text>
          <Text className="font-regular text-callout text-muted-foreground">
            {new Date(measuredAt).toLocaleDateString(i18n.language, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {input('weight', t('measurements.weight', { unit: weightUnit }))}
          {input('fat', t('measurements.fat'))}
        </View>
        <Text accessibilityRole="header" className="font-semibold text-headline text-foreground">
          {t('measurements.sites', { unit: lengthUnit })}
        </Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {lengthFields.map((f) => input(f, t(`measurements.fields.${f}`)))}
        </View>
        {showError ? (
          <Text
            accessibilityLiveRegion="polite"
            className="font-medium text-footnote text-destructive-text"
          >
            {t('measurements.required')}
          </Text>
        ) : null}
        {existing ? (
          <Button label={t('measurements.delete')} variant="destructive" onPress={remove} />
        ) : null}
      </ScrollView>
      <View className="border-t border-border bg-surface-raised px-4 pb-6 pt-3">
        <Button label={t('measurements.save')} size="lg" onPress={save} />
      </View>
    </>
  );
}

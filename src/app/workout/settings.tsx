import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { formatWeight, parseWeight } from '@/lib/units';
import { type Preferences, usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { SchemeScope, useScheme } from '@/theme/theme-root';

export default function WorkoutSettingsRoute() {
  return (
    <SchemeScope scheme="workout">
      <WorkoutSettingsScreen />
    </SchemeScope>
  );
}

function WorkoutSettingsScreen() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const prefs = usePreferences();
  const [bodyWeight, setBodyWeight] = useState(formatWeight(prefs.bodyWeightKg, prefs.weightUnit));

  const toggle = (
    key: 'restNotification' | 'rpeEnabled' | 'countWarmupsInVolume',
    label: string,
  ) => (
    <View className="min-h-log flex-row items-center justify-between gap-4">
      <Text nativeID={key} className="flex-1 font-regular text-body text-foreground">
        {label}
      </Text>
      <Switch
        accessibilityLabelledBy={key}
        value={prefs[key]}
        onValueChange={(v) => prefs.set({ [key]: v })}
        trackColor={{ true: hex(scheme, 'primary'), false: hex(scheme, 'border-strong') }}
        thumbColor={hex(scheme, 'foreground')}
      />
    </View>
  );

  const previousOption = (value: Preferences['previousValuesMode'], label: string) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: prefs.previousValuesMode === value }}
      onPress={() => prefs.set({ previousValuesMode: value })}
      className={`min-h-touch justify-center rounded-md border px-4 ${
        prefs.previousValuesMode === value
          ? 'border-primary-text bg-primary/15'
          : 'border-border-strong bg-surface'
      }`}
    >
      <Text
        className={`font-medium text-body ${
          prefs.previousValuesMode === value ? 'text-primary-text' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      className="flex-1 bg-surface-raised"
      contentContainerClassName="gap-5 px-4 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
        {t('workout.settingsTitle')}
      </Text>
      <View>
        {toggle('restNotification', t('workout.restNotification'))}
        {toggle('rpeEnabled', t('workout.rpeEnabled'))}
        {toggle('countWarmupsInVolume', t('workout.countWarmups'))}
      </View>
      <View accessibilityRole="radiogroup" className="gap-2">
        <Text className="font-medium text-callout text-foreground">
          {t('workout.previousFrom')}
        </Text>
        {previousOption('any', t('workout.previousAny'))}
        {previousOption('routine', t('workout.previousRoutine'))}
      </View>
      <View className="gap-2">
        <Text nativeID="body-weight" className="font-medium text-callout text-foreground">
          {t('workout.bodyWeight', { unit: prefs.weightUnit })}
        </Text>
        <TextInput
          accessibilityLabelledBy="body-weight"
          accessibilityHint={t('workout.bodyWeightHint')}
          value={bodyWeight}
          onChangeText={setBodyWeight}
          onEndEditing={() =>
            prefs.set({ bodyWeightKg: parseWeight(bodyWeight, prefs.weightUnit) })
          }
          keyboardType="decimal-pad"
          className="min-h-log rounded-md border border-border-strong bg-surface px-4 font-regular text-body text-foreground"
        />
        <Text className="font-regular text-footnote text-muted-foreground">
          {t('workout.bodyWeightHint')}
        </Text>
      </View>
    </ScrollView>
  );
}

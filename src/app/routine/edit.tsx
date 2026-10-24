import { router, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { saveDraft } from '@/features/routines/data';
import { ExerciseEditor } from '@/features/routines/exercise-editor';
import { usePreferences } from '@/stores/preferences';
import { useRoutineDraft } from '@/stores/routine-draft';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function RoutineEditor() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const draft = useRoutineDraft((s) => s.draft);
  const dirty = useRoutineDraft((s) => s.dirty);
  const { setName, setNotes, clear } = useRoutineDraft.getState();
  const weightUnit = usePreferences((s) => s.weightUnit);
  const distanceUnit = usePreferences((s) => s.distanceUnit);
  const [showError, setShowError] = useState(false);

  usePreventRemove(dirty, () => {
    Alert.alert(t('routineEditor.discardTitle'), undefined, [
      { text: t('routineEditor.keepEditing'), style: 'cancel' },
      {
        text: t('routineEditor.discard'),
        style: 'destructive',
        onPress: clear,
      },
    ]);
  });

  useEffect(() => {
    if (!draft) router.back();
  }, [draft]);

  if (!draft) return null;

  const nameMissing = draft.name.trim().length === 0;
  const save = () => {
    if (nameMissing) {
      setShowError(true);
      return;
    }
    saveDraft(draft, { weightUnit, distanceUnit });
    clear();
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-surface-raised"
        contentContainerClassName="gap-5 px-4 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
          {t(draft.routineId ? 'routineEditor.editTitle' : 'routineEditor.newTitle')}
        </Text>

        <View className="gap-2">
          <Text nativeID="routine-name" className="font-medium text-callout text-foreground">
            {t('routineEditor.name')}
          </Text>
          <TextInput
            accessibilityLabelledBy="routine-name"
            value={draft.name}
            onChangeText={setName}
            autoCapitalize="words"
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
              {t('routineEditor.nameRequired')}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Text nativeID="routine-notes" className="font-medium text-callout text-foreground">
            {t('routineEditor.notes')}
          </Text>
          <TextInput
            accessibilityLabelledBy="routine-notes"
            value={draft.notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            className="min-h-[88px] rounded-md border border-border-strong bg-surface px-4 py-3 font-regular text-body text-foreground"
          />
        </View>

        {draft.exercises.length === 0 ? (
          <Text className="font-regular text-callout text-muted-foreground">
            {t('routineEditor.empty')}
          </Text>
        ) : (
          <ExerciseEditor exercises={draft.exercises} actions={useRoutineDraft.getState()} />
        )}

        <Button
          label={t('routineEditor.addExercise')}
          variant="secondary"
          size="lg"
          onPress={() =>
            router.push({ pathname: '/routine/add-exercise', params: { target: 'routine' } })
          }
        />
      </ScrollView>
      <View className="border-t border-border bg-surface-raised px-4 pb-6 pt-3">
        <Button label={t('routineEditor.save')} size="lg" onPress={save} />
      </View>
    </>
  );
}

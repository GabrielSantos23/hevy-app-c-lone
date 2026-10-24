import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from 'react-native';

import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { Button } from './button';

type TextPromptProps = {
  title: string;
  label: string;
  initial: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

export function TextPrompt({
  title,
  label,
  initial,
  confirmLabel,
  onSubmit,
  onClose,
}: TextPromptProps) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const [value, setValue] = useState(initial);
  const valid = value.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    onClose();
    onSubmit(value);
  };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center bg-black/50 px-6"
      >
        <View accessibilityViewIsModal className="gap-4 rounded-lg bg-surface-raised p-5">
          <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
            {title}
          </Text>
          <View className="gap-2">
            <Text nativeID="prompt-label" className="font-medium text-callout text-foreground">
              {label}
            </Text>
            <TextInput
              accessibilityLabelledBy="prompt-label"
              autoFocus
              value={value}
              onChangeText={setValue}
              onSubmitEditing={submit}
              returnKeyType="done"
              autoCapitalize="words"
              placeholderTextColor={hex(scheme, 'muted-foreground')}
              className="min-h-log rounded-md border border-border-strong bg-surface px-4 font-regular text-body text-foreground"
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button label={confirmLabel} onPress={submit} disabled={!valid} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

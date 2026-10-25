import { Stack } from 'expo-router';
import { CaretDown, CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { FINISH_SHORTCUT, START_SHORTCUT } from '@/features/watch/shortcuts';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function WatchScreen() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const enabled = usePreferences((s) => s.watchShortcuts);
  const set = usePreferences((s) => s.set);
  const [open, setOpen] = useState<'start' | 'finish' | null>(null);

  const steps = (key: 'start' | 'finish', title: string, items: string[]) => {
    const expanded = open === key;
    const Caret = expanded ? CaretDown : CaretRight;
    return (
      <View className="rounded-lg bg-surface">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setOpen(expanded ? null : key)}
          className="min-h-log flex-row items-center gap-3 px-4"
        >
          <Text className="flex-1 font-semibold text-headline text-foreground">{title}</Text>
          <Caret size={18} color={hex(scheme, 'muted-foreground')} />
        </Pressable>
        {expanded ? (
          <View className="gap-3 px-4 pb-4">
            {items.map((item, i) => (
              <View key={item} className="flex-row gap-3">
                <Text className="w-5 font-semibold text-body text-primary-text">{i + 1}</Text>
                <Text className="flex-1 font-regular text-body text-foreground">{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('watch.title'), headerLargeTitle: false }} />
      <View className="gap-6 pb-10 pt-2">
        <Text className="font-regular text-body text-muted-foreground">{t('watch.intro')}</Text>
        <View className="min-h-log flex-row items-center gap-4 rounded-lg bg-surface px-4 py-2">
          <View className="flex-1 gap-0.5">
            <Text nativeID="watchShortcuts" className="font-medium text-body text-foreground">
              {t('watch.toggleLabel')}
            </Text>
            <Text className="font-regular text-footnote text-muted-foreground">
              {t('watch.toggleBody')}
            </Text>
          </View>
          <Switch
            accessibilityLabelledBy="watchShortcuts"
            value={enabled}
            onValueChange={(v) => set({ watchShortcuts: v })}
            trackColor={{ true: hex(scheme, 'primary'), false: hex(scheme, 'border-strong') }}
            thumbColor={hex(scheme, 'foreground')}
          />
        </View>
        <View className="gap-3">
          <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
            {t('watch.setupTitle')}
          </Text>
          {steps('start', t('watch.startTitle', { name: START_SHORTCUT }), [t('watch.startStep2')])}
          {steps('finish', t('watch.finishTitle', { name: FINISH_SHORTCUT }), [
            t('watch.finishStep2'),
            t('watch.finishStep3'),
            t('watch.finishStep4'),
            t('watch.finishStep5'),
          ])}
        </View>
        <Button
          label={t('watch.openShortcuts')}
          variant="secondary"
          onPress={() => Linking.openURL('shortcuts://').catch(() => {})}
        />
      </View>
    </Screen>
  );
}

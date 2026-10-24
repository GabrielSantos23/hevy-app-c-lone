import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { healthSupported, requestHealthAccess } from '@/features/health/healthkit';
import { syncHealth } from '@/features/health/sync';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function HealthScreen() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const prefs = usePreferences();
  const [supported] = useState(healthSupported);
  const [busy, setBusy] = useState(false);

  const enable = async (key: 'healthSync' | 'healthWrite', value: boolean) => {
    if (!value) return prefs.set({ [key]: false });
    const granted = await requestHealthAccess(key === 'healthWrite' || prefs.healthWrite).catch(
      () => false,
    );
    if (granted) prefs.set({ [key]: true });
    else Alert.alert(t('health.deniedTitle'), t('health.deniedBody'));
  };

  const checkNow = async () => {
    setBusy(true);
    const result = await syncHealth();
    setBusy(false);
    Alert.alert(
      t('health.checkedTitle'),
      result
        ? [
            t('health.linked', { count: result.linked }),
            result.ambiguous ? t('health.ambiguous', { count: result.ambiguous }) : '',
          ]
            .filter(Boolean)
            .join('\n')
        : t('health.unavailableBody'),
    );
  };

  const toggle = (key: 'healthSync' | 'healthWrite', label: string, body: string) => (
    <View className="min-h-log flex-row items-center gap-4 py-2">
      <View className="flex-1 gap-0.5">
        <Text nativeID={key} className="font-medium text-body text-foreground">
          {label}
        </Text>
        <Text className="font-regular text-footnote text-muted-foreground">{body}</Text>
      </View>
      <Switch
        accessibilityLabelledBy={key}
        disabled={!supported}
        value={supported && prefs[key]}
        onValueChange={(v) => enable(key, v)}
        trackColor={{ true: hex(scheme, 'primary'), false: hex(scheme, 'border-strong') }}
        thumbColor={hex(scheme, 'foreground')}
      />
    </View>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('health.title'), headerLargeTitle: false }} />
      <View className="gap-6 pb-10 pt-2">
        <Text className="font-regular text-body text-muted-foreground">{t('health.intro')}</Text>
        {supported ? null : (
          <View className="gap-1 rounded-lg bg-surface p-4">
            <Text className="font-semibold text-body text-foreground">
              {t('health.unavailableTitle')}
            </Text>
            <Text className="font-regular text-footnote text-muted-foreground">
              {t('health.unavailableBody')}
            </Text>
          </View>
        )}
        <View className="rounded-lg bg-surface px-4">
          {toggle('healthSync', t('health.syncLabel'), t('health.syncBody'))}
          <View className="h-px bg-border" />
          {toggle('healthWrite', t('health.writeLabel'), t('health.writeBody'))}
        </View>
        {supported && prefs.healthSync ? (
          <Button
            label={busy ? t('health.checking') : t('health.checkNow')}
            variant="secondary"
            disabled={busy}
            onPress={checkNow}
          />
        ) : null}
      </View>
    </Screen>
  );
}

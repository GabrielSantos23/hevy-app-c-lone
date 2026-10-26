import '../global.css';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { seedExercises } from '@/db/seed/run-seed';
import { startWidgetSync } from '@/features/widgets/sync';
import { resolveLocale } from '@/i18n';
import { usePreferences } from '@/stores/preferences';
import { ThemeRoot } from '@/theme/theme-root';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const locale = usePreferences((s) => s.locale);
  const { i18n } = useTranslation();
  const [boot, setBoot] = useState<{ done: boolean; error?: Error }>({ done: false });
  const bootError = boot.error;
  const ready = (fontsLoaded || fontError !== null) && boot.done;

  useEffect(() => {
    migrate(db, migrations)
      .then(seedExercises)
      .then(
        () => {
          setBoot({ done: true });
          startWidgetSync();
        },
        (e: unknown) => {
          console.error('Boot failed', e);
          setBoot({ done: true, error: e instanceof Error ? e : new Error(String(e)) });
        },
      );
  }, []);

  useEffect(() => {
    i18n.changeLanguage(resolveLocale(locale));
  }, [i18n, locale]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeRoot>
      {bootError ? (
        <BootError message={bootError.message} />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="watch-sync" options={{ animation: 'none' }} />
          <Stack.Screen
            name="routine/edit"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen name="routine/add-exercise" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="workout/index"
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen
            name="workout/summary"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="workout/settings"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.8, 1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="measurement/form"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="exercise/form"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
            }}
          />
        </Stack>
      )}
    </ThemeRoot>
  );
}

function BootError({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-2 px-4">
      <Text className="font-semibold text-headline text-foreground">{t('boot.dbError')}</Text>
      <Text selectable className="font-regular text-footnote text-muted-foreground">
        {message}
      </Text>
    </View>
  );
}

import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { fontFamily, hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export function TabStack() {
  const scheme = useScheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: Platform.OS === 'ios',
        headerShadowVisible: false,
        headerTintColor: hex(scheme, 'primary-text'),
        headerStyle:
          Platform.OS === 'ios' ? undefined : { backgroundColor: hex(scheme, 'background') },
        headerTitleStyle: { fontFamily: fontFamily.semibold, color: hex(scheme, 'foreground') },
        headerLargeTitleStyle: { fontFamily: fontFamily.bold, color: hex(scheme, 'foreground') },
      }}
    />
  );
}

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react';
import { Appearance, useColorScheme, View } from 'react-native';

import { usePreferences } from '@/stores/preferences';

import { type ColorScheme, cssVars, hex } from './tokens';

const SchemeOverride = createContext<ColorScheme | null>(null);

export function useScheme(): ColorScheme {
  const override = useContext(SchemeOverride);
  const preference = usePreferences((s) => s.theme);
  const system = useColorScheme();
  if (override) return override;
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const preference = usePreferences((s) => s.theme);
  const scheme = useScheme();

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: hex(scheme, 'primary-text'),
        background: hex(scheme, 'background'),
        card: hex(scheme, 'surface'),
        text: hex(scheme, 'foreground'),
        border: hex(scheme, 'border'),
        notification: hex(scheme, 'primary'),
      },
    };
  }, [scheme]);

  return (
    <ThemeProvider value={navTheme}>
      <View style={vars(cssVars(scheme))} className="flex-1 bg-background">
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </ThemeProvider>
  );
}

export function SchemeScope({ scheme, children }: { scheme: ColorScheme; children: ReactNode }) {
  return (
    <SchemeOverride.Provider value={scheme}>
      <View style={vars(cssVars(scheme))} className="flex-1 bg-background">
        {children}
      </View>
    </SchemeOverride.Provider>
  );
}

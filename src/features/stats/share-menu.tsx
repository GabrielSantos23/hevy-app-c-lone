import { Stack } from 'expo-router';
import { Export } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { ActionSheet } from '@/components/ui/action-sheet';
import { nativeToolbar } from '@/lib/use-glass';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { type ReportPeriod, reportPeriods } from './report';
import { useShareWorkouts } from './share';

const periods = Object.keys(reportPeriods) as ReportPeriod[];
const periodIcons = {
  week: 'calendar',
  month: 'calendar.badge.clock',
  year: 'calendar.circle',
} as const;

// Header button that exports the last week, month or year of workouts.
export function ShareWorkoutsMenu() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const [shareMenu, setShareMenu] = useState(false);
  const share = useShareWorkouts();
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: nativeToolbar
            ? undefined
            : () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('share.button')}
                  onPress={() => setShareMenu(true)}
                  className="min-h-touch min-w-touch items-center justify-center"
                >
                  <Export size={24} color={hex(scheme, 'primary-text')} />
                </Pressable>
              ),
        }}
      />
      {nativeToolbar ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon="square.and.arrow.up" accessibilityLabel={t('share.button')}>
            {periods.map((p) => (
              <Stack.Toolbar.Menu key={p} icon={periodIcons[p]} title={t(`share.period.${p}`)}>
                <Stack.Toolbar.MenuAction icon="doc.text" onPress={() => share(p, 'file')}>
                  {t('share.file')}
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction icon="sparkles" onPress={() => share(p, 'claude')}>
                  {t('share.claude')}
                </Stack.Toolbar.MenuAction>
              </Stack.Toolbar.Menu>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : (
        <ActionSheet
          title={t('share.button')}
          visible={shareMenu}
          onClose={() => setShareMenu(false)}
          actions={periods.flatMap((p) =>
            (['file', 'claude'] as const).map((target) => ({
              label: `${t(`share.period.${p}`)} · ${t(`share.${target}`)}`,
              onPress: () => {
                setShareMenu(false);
                share(p, target);
              },
            })),
          )}
        />
      )}
    </>
  );
}

import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { WorkoutAccessory } from '@/features/workouts/workout-accessory';
import { useGlass } from '@/lib/use-glass';
import { useWorkout } from '@/stores/workout';
import { fontFamily, hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

export default function TabsLayout() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const glass = useGlass();
  const workoutActive = useWorkout((s) => s.workout !== null);

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      labelVisibilityMode="labeled"
      tintColor={hex(scheme, 'primary-text')}
      backgroundColor={hex(scheme, 'surface')}
      indicatorColor={`${hex(scheme, 'primary')}29`}
      iconColor={{
        default: hex(scheme, 'muted-foreground'),
        selected: hex(scheme, 'primary-text'),
      }}
      labelStyle={{
        default: { color: hex(scheme, 'muted-foreground'), fontFamily: fontFamily.medium },
        selected: { color: hex(scheme, 'primary-text'), fontFamily: fontFamily.semibold },
      }}
    >
      {glass && workoutActive ? (
        <NativeTabs.BottomAccessory>
          <WorkoutAccessory />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="train">
        <NativeTabs.Trigger.Label>{t('tabs.train')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell.fill" md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>{t('tabs.history')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exercises">
        <NativeTabs.Trigger.Label>{t('tabs.exercises')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="format_list_bulleted" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

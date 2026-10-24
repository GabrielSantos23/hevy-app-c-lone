import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Barbell } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useNow } from '@/lib/use-now';
import { useWorkout } from '@/stores/workout';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { formatDurationWords } from './stats';

export function WorkoutAccessory() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const workout = useWorkout((s) => s.workout);
  const now = useNow(1000, workout !== null);
  const placement = NativeTabs.BottomAccessory.usePlacement();
  if (!workout) return null;
  const elapsed = formatDurationWords((now - workout.startedAt) / 1000);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('train.resumeLabel', { name: workout.name, time: elapsed })}
      onPress={() => router.push('/workout')}
      className="flex-1 flex-row items-center gap-3 px-4"
    >
      <Barbell size={20} weight="fill" color={hex(scheme, 'primary-text')} />
      {placement === 'inline' ? (
        <Text numberOfLines={1} className="flex-1 font-semibold text-callout text-foreground">
          {elapsed}
        </Text>
      ) : (
        <>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-semibold text-callout text-foreground">
              {workout.name}
            </Text>
            <Text className="font-regular text-footnote text-primary-text">{elapsed}</Text>
          </View>
          <Text className="font-semibold text-callout text-primary-text">
            {t('workout.resume')}
          </Text>
        </>
      )}
    </Pressable>
  );
}

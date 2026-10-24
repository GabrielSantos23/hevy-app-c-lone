import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import type { WeekStart } from './calc';

export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function MonthCalendar({
  month,
  workoutDays,
  weekStart,
  onChangeMonth,
}: {
  month: Date;
  workoutDays: Set<string>;
  weekStart: WeekStart;
  onChangeMonth: (delta: -1 | 1) => void;
}) {
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const lead = (first.getDay() - (weekStart === 'monday' ? 1 : 0) + 7) % 7;
  const days = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const [today] = useState(() => dayKey(Date.now()));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, (weekStart === 'monday' ? 1 : 7) + i).toLocaleDateString(i18n.language, {
      weekday: 'narrow',
    }),
  );
  const count = cells.filter((d) => d && workoutDays.has(`${year}-${m}-${d}`)).length;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.previousMonth')}
          onPress={() => onChangeMonth(-1)}
          className="min-h-touch min-w-touch items-center justify-center rounded-full active:bg-surface-raised"
        >
          <CaretLeft size={20} color={hex(scheme, 'foreground')} />
        </Pressable>
        <View accessible className="items-center">
          <Text accessibilityRole="header" className="font-semibold text-headline text-foreground">
            {month.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
          </Text>
          <Text className="font-regular text-footnote text-muted-foreground">
            {t('history.workoutCount', { count })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.nextMonth')}
          onPress={() => onChangeMonth(1)}
          className="min-h-touch min-w-touch items-center justify-center rounded-full active:bg-surface-raised"
        >
          <CaretRight size={20} color={hex(scheme, 'foreground')} />
        </Pressable>
      </View>
      <View className="flex-row" importantForAccessibility="no-hide-descendants">
        {weekdays.map((w, i) => (
          <Text
            key={i}
            className="flex-1 text-center font-medium text-caption text-muted-foreground"
          >
            {w}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap" importantForAccessibility="no-hide-descendants">
        {cells.map((d, i) => {
          const key = `${year}-${m}-${d}`;
          const trained = d !== null && workoutDays.has(key);
          return (
            <View key={i} className="aspect-square w-[14.28%] items-center justify-center">
              {d ? (
                <View
                  className={`h-9 w-9 items-center justify-center rounded-full ${
                    trained ? 'bg-primary' : key === today ? 'border border-primary-text' : ''
                  }`}
                >
                  <Text
                    className={`font-medium text-callout ${trained ? 'text-on-primary' : 'text-foreground'}`}
                  >
                    {d}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

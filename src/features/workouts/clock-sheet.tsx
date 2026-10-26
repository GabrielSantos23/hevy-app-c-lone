import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useNow } from '@/lib/use-now';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { startRest } from './rest-timer';
import { formatClock } from './stats';

const RING = 240;
const STROKE = 8;
const STEP = 15;

type Watch = { startedAt: number | null; elapsed: number };

export function ClockSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const defaultRest = usePreferences((s) => s.defaultRestSeconds);
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  const [seconds, setSeconds] = useState(defaultRest || 90);
  const [watch, setWatch] = useState<Watch>({ startedAt: null, elapsed: 0 });
  const running = watch.startedAt !== null;
  const now = useNow(250, visible && running);
  const watchSeconds = Math.floor(
    (watch.elapsed + (running ? now - (watch.startedAt ?? now) : 0)) / 1000,
  );
  const shown = mode === 'timer' ? seconds : watchSeconds;

  const tab = (value: typeof mode, label: string) => (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: mode === value }}
      onPress={() => setMode(value)}
      className={`min-h-touch flex-1 items-center justify-center rounded-md ${
        mode === value ? 'bg-primary' : ''
      }`}
    >
      <Text
        className={`font-medium text-body ${mode === value ? 'text-on-primary' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );

  const step = (delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(delta < 0 ? 'workout.restLess' : 'workout.restMore')}
      onPress={() => setSeconds((s) => Math.min(3600, Math.max(STEP, s + delta)))}
      className="min-h-touch min-w-touch items-center justify-center"
    >
      <Text className="font-semibold text-body text-primary-text">
        {delta < 0 ? `−${STEP}s` : `+${STEP}s`}
      </Text>
    </Pressable>
  );

  return (
    <Sheet title={t('workout.clock')} visible={visible} onClose={onClose}>
      <View className="gap-6 px-2 pb-2">
        <View accessibilityRole="tablist" className="flex-row rounded-lg border border-border p-1">
          {tab('timer', t('workout.timer'))}
          {tab('stopwatch', t('workout.stopwatch'))}
        </View>
        <View className="items-center justify-center" style={{ height: RING }}>
          <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={(RING - STROKE) / 2}
              stroke={hex(scheme, 'primary')}
              strokeWidth={STROKE}
              fill="none"
            />
          </Svg>
          <Text
            accessibilityLabel={
              mode === 'timer'
                ? t('workout.timerValue', { time: formatClock(shown) })
                : t('workout.stopwatchValue', { time: formatClock(shown) })
            }
            className="font-semibold text-display text-foreground"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatClock(shown)}
          </Text>
        </View>
        {mode === 'timer' ? (
          <>
            <View className="flex-row justify-between">
              {step(-STEP)}
              {step(STEP)}
            </View>
            <Button
              label={t('workout.startTimer')}
              size="lg"
              onPress={() => {
                startRest(seconds);
                onClose();
              }}
            />
          </>
        ) : (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label={t('workout.resetStopwatch')}
                variant="tonal"
                size="lg"
                disabled={running || watch.elapsed === 0}
                onPress={() => setWatch({ startedAt: null, elapsed: 0 })}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t(running ? 'workout.stopStopwatch' : 'workout.startTimer')}
                size="lg"
                onPress={() =>
                  setWatch((w) =>
                    w.startedAt === null
                      ? { ...w, startedAt: Date.now() }
                      : { startedAt: null, elapsed: w.elapsed + Date.now() - w.startedAt },
                  )
                }
              />
            </View>
          </View>
        )}
      </View>
    </Sheet>
  );
}

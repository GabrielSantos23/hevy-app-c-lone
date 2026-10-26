import { GlassView } from 'expo-glass-effect';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Barbell, CaretDown, Plus, Timer } from 'phosphor-react-native';
import { type ReactNode, useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Muscle } from '@/db/schema';
import { ExerciseEditor } from '@/features/routines/exercise-editor';
import type { UnitPrefs } from '@/features/routines/convert';
import { stopWatchWorkout } from '@/features/watch/shortcuts';
import { BodyMap } from '@/features/workouts/body-map';
import { ClockSheet } from '@/features/workouts/clock-sheet';
import { completeSet } from '@/features/workouts/complete-set';
import { finishWorkout, hasDoneSets, previousSets } from '@/features/workouts/data';
import { adjustRest, stopRest } from '@/features/workouts/rest-timer';
import {
  formatClock,
  formatDurationWords,
  muscleSets,
  workoutTotals,
} from '@/features/workouts/stats';
import { formatWeight } from '@/lib/units';
import { nativeToolbar, useGlass } from '@/lib/use-glass';
import { useNow } from '@/lib/use-now';
import type { DraftExercise, DraftSet } from '@/stores/exercise-draft';
import { usePreferences } from '@/stores/preferences';
import { useWorkout } from '@/stores/workout';
import { fontFamily, glassTint, hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

// fromWatch: the Watch workout already ended, so finish without asking and leave the Watch alone.
function confirmFinish(t: TFunction, units: UnitPrefs, fromWatch = false) {
  const workout = useWorkout.getState().workout;
  if (!workout) return;
  if (!hasDoneSets(workout.exercises)) {
    Alert.alert(t('workout.nothingDoneTitle'), t('workout.nothingDoneBody'));
    return;
  }
  const done = () => {
    finishWorkout(workout, units, Date.now());
    stopRest();
    useWorkout.getState().end();
    if (!fromWatch) stopWatchWorkout();
  };
  if (fromWatch) return done();
  Alert.alert(t('workout.finishTitle'), undefined, [
    { text: t('workout.keepGoing'), style: 'cancel' },
    { text: t('workout.finish'), onPress: done },
  ]);
}

export default function WorkoutScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const scheme = useScheme();
  const workout = useWorkout((s) => s.workout);
  const rest = useWorkout((s) => s.rest);
  const prefs = usePreferences();
  const units = { weightUnit: prefs.weightUnit, distanceUnit: prefs.distanceUnit };
  const now = useNow(1000, workout !== null);
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [timerMenu, setTimerMenu] = useState(false);
  const glass = useGlass();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!workout) router.back();
  }, [workout]);

  // The Watch workout ended (watch-sync), so this one finishes too.
  const { finish: finishParam } = useLocalSearchParams<{ finish?: string }>();
  const onFinishParam = useEffectEvent(() => {
    router.setParams({ finish: undefined });
    confirmFinish(t, units, true);
  });
  useEffect(() => {
    if (finishParam === '1') onFinishParam();
  }, [finishParam]);

  const exerciseIds = workout?.exercises.map((e) => e.exerciseId).join(',') ?? '';
  const routineFilter =
    prefs.previousValuesMode === 'routine' ? (workout?.routineId ?? null) : null;
  const previous = useMemo(
    () => previousSets(exerciseIds ? exerciseIds.split(',') : [], routineFilter),
    [exerciseIds, routineFilter],
  );

  if (!workout) return null;

  const { volume, sets } = workoutTotals(
    workout.exercises,
    units,
    prefs.bodyWeightKg,
    prefs.countWarmupsInVolume,
  );
  const muscles = muscleSets(workout.exercises, prefs.countWarmupsInVolume);

  const toggleDone = (entry: DraftExercise, set: DraftSet, hints: Partial<DraftSet>) => {
    const { updateSet } = useWorkout.getState();
    if (set.done) {
      updateSet(entry.key, set.key, { done: false, doneAt: null });
      return;
    }
    if (!completeSet(entry.key, set.key, hints)) Vibration.vibrate(60);
  };

  const close = () => {
    stopRest();
    useWorkout.getState().end();
    stopWatchWorkout();
  };

  const discard = () =>
    Alert.alert(t('workout.discardTitle'), t('workout.discardBody'), [
      { text: t('workout.keepGoing'), style: 'cancel' },
      { text: t('workout.discard'), style: 'destructive', onPress: close },
    ]);

  const finish = () => confirmFinish(t, units);

  const worked = (Object.entries(muscles) as [Muscle, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <View style={{ paddingTop: nativeToolbar ? 0 : insets.top }} className="flex-1 bg-background">
      {nativeToolbar ? (
        <>
          <Stack.Screen
            options={{
              headerShown: true,
              title: t('workout.logTitle'),
              headerShadowVisible: false,
              headerStyle: { backgroundColor: hex(scheme, 'surface') },
              headerTintColor: hex(scheme, 'foreground'),
              headerTitleStyle: { color: hex(scheme, 'foreground'), fontFamily: fontFamily.medium },
            }}
          />
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              icon="chevron.down"
              accessibilityLabel={t('workout.minimize')}
              onPress={() => router.back()}
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="timer"
              accessibilityLabel={t('workout.clock')}
              onPress={() => setTimerMenu(true)}
            />
            <Stack.Toolbar.Button
              variant="prominent"
              tintColor={hex(scheme, 'primary')}
              onPress={finish}
            >
              {t('workout.finish')}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        </>
      ) : (
        <View className="flex-row items-center gap-3 border-b border-border bg-surface px-3 py-2">
          <RoundButton label={t('workout.minimize')} onPress={() => router.back()}>
            <CaretDown size={22} color={hex(scheme, 'foreground')} />
          </RoundButton>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            className="flex-1 font-regular text-headline text-foreground"
          >
            {t('workout.logTitle')}
          </Text>
          <RoundButton label={t('workout.clock')} onPress={() => setTimerMenu(true)}>
            <Timer size={24} color={hex(scheme, 'foreground')} />
          </RoundButton>
          <Button label={t('workout.finish')} pill onPress={finish} />
        </View>
      )}

      {workout.exercises.length ? (
        <ExerciseProgress
          done={workout.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)}
          total={workout.exercises.reduce((n, e) => n + e.sets.length, 0)}
        />
      ) : null}
      <View className="flex-row items-center border-b border-border px-4 py-4">
        <Stat
          label={t('workout.duration')}
          value={formatDurationWords((now - workout.startedAt) / 1000)}
          accent
        />
        <Stat
          label={t('workout.volume')}
          value={`${formatWeight(volume, prefs.weightUnit)} ${prefs.weightUnit}`}
        />
        <Stat label={t('workout.sets')} value={String(sets)} />
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('workout.musclesHint')}
          onPress={() => setMusclesOpen(true)}
          className="rounded-md active:opacity-70"
        >
          <BodyMap sets={muscles} height={52} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName={`gap-5 px-4 pt-4 ${rest && glass ? 'pb-72' : 'pb-10'}`}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {workout.exercises.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Barbell size={40} color={hex(scheme, 'muted-foreground')} weight="duotone" />
            <Text className="font-semibold text-title-2 text-foreground">
              {t('workout.emptyTitle')}
            </Text>
            <Text className="text-center font-regular text-body text-muted-foreground">
              {t('workout.emptyBody')}
            </Text>
          </View>
        ) : (
          <ExerciseEditor
            exercises={workout.exercises}
            actions={useWorkout.getState()}
            workout={{ previous, onToggleDone: toggleDone }}
          />
        )}
        <Button
          label={t('routineEditor.addExercise')}
          icon={<Plus size={20} weight="bold" color={hex(scheme, 'on-primary')} />}
          size="lg"
          onPress={() =>
            router.push({ pathname: '/routine/add-exercise', params: { target: 'workout' } })
          }
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={t('workout.settings')}
              variant="tonal"
              onPress={() => router.push('/workout/settings')}
            />
          </View>
          <View className="flex-1">
            <Button label={t('workout.discard')} variant="tonal-destructive" onPress={discard} />
          </View>
        </View>
      </ScrollView>

      {rest ? <RestBar endsAt={rest.endsAt} total={rest.total} /> : null}

      <ClockSheet visible={timerMenu} onClose={() => setTimerMenu(false)} />

      <Sheet
        title={t('workout.musclesTitle')}
        visible={musclesOpen}
        onClose={() => setMusclesOpen(false)}
      >
        <View className="items-center py-2">
          <BodyMap sets={muscles} height={200} />
        </View>
        {worked.length ? (
          worked.map(([m, n]) => (
            <View key={m} className="min-h-touch flex-row items-center justify-between px-4">
              <Text className="font-regular text-body text-foreground">{t(`muscles.${m}`)}</Text>
              <Text className="font-semibold text-body text-foreground">
                {t('workout.setCount', { count: n })}
              </Text>
            </View>
          ))
        ) : (
          <Text className="px-4 pb-4 font-regular text-body text-muted-foreground">
            {t('workout.musclesEmpty')}
          </Text>
        )}
      </Sheet>
    </View>
  );
}

function ExerciseProgress({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('workout.exerciseProgress', { done, total })}
      accessibilityValue={{ min: 0, max: total, now: done }}
      className="h-1 bg-surface-raised"
    >
      <View style={{ width: `${(done / total) * 100}%` }} className="h-1 bg-primary" />
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full bg-surface-raised active:opacity-80"
    >
      {children}
    </Pressable>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} className="flex-1 gap-1">
      <Text className="font-regular text-footnote text-muted-foreground">{label}</Text>
      <Text
        className={`font-regular text-body ${accent ? 'text-primary-text' : 'text-foreground'}`}
      >
        {value}
      </Text>
    </View>
  );
}

function RestBar({ endsAt, total }: { endsAt: number; total: number }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow(250);
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (remaining > 0) return;
    Vibration.vibrate([0, 300, 150, 300]);
    stopRest();
  }, [remaining]);

  const glass = useGlass();
  const scheme = useScheme();
  const content = (
    <>
      <View
        className={`h-1.5 bg-surface-raised ${glass ? 'mt-4 overflow-hidden rounded-full' : '-mx-4'}`}
      >
        <View
          style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }}
          className="h-1.5 bg-primary"
        />
      </View>
      <Text
        accessibilityLabel={t('workout.restRemaining', { time: formatClock(remaining) })}
        className="text-center font-semibold text-display text-foreground"
      >
        {formatClock(remaining)}
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label="−15"
            variant="tonal"
            size="lg"
            onPress={() => adjustRest(-15)}
            accessibilityLabel={t('workout.restLess')}
          />
        </View>
        <View className="flex-1">
          <Button
            label="+15"
            variant="tonal"
            size="lg"
            onPress={() => adjustRest(15)}
            accessibilityLabel={t('workout.restMore')}
          />
        </View>
        <View className="flex-1">
          <Button label={t('workout.skipRest')} size="lg" onPress={stopRest} />
        </View>
      </View>
    </>
  );

  if (glass)
    return (
      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="absolute bottom-0 left-0 right-0 px-3"
      >
        <GlassView colorScheme={scheme} tintColor={glassTint(scheme)} style={{ borderRadius: 32 }}>
          <View className="gap-4 px-4 pb-4">{content}</View>
        </GlassView>
      </View>
    );

  return (
    <View style={{ paddingBottom: insets.bottom + 12 }} className="gap-4 bg-surface px-4 pt-0">
      {content}
    </View>
  );
}

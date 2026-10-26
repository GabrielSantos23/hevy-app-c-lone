import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  CaretDown,
  CaretRight,
  ClipboardText,
  DownloadSimple,
  DotsThree,
  FolderSimplePlus,
  Plus,
} from 'phosphor-react-native';
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TextPrompt } from '@/components/ui/text-prompt';
import { useDbQuery } from '@/db/use-db-query';
import { useExerciseName } from '@/features/exercises/display';
import { useHevyRoutineImport } from '@/features/hevy/import-routine';
import {
  createFolder,
  deleteFolder,
  deleteRoutine,
  duplicateRoutine,
  loadDraft,
  moveRoutine,
  renameFolder,
  type RoutineSummary,
  routineList,
  routineTables,
} from '@/features/routines/data';
import { startWatchWorkout } from '@/features/watch/shortcuts';
import { workoutFromRoutine } from '@/features/workouts/data';
import { prepareRestNotifications, stopRest } from '@/features/workouts/rest-timer';
import { formatElapsed } from '@/features/workouts/stats';
import { useGlass } from '@/lib/use-glass';
import { useNow } from '@/lib/use-now';
import { usePreferences } from '@/stores/preferences';
import { useRoutineDraft } from '@/stores/routine-draft';
import { type ActiveWorkout, useWorkout } from '@/stores/workout';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

type Folder = { id: string; name: string };

type Sheet =
  | { kind: 'routine'; routine: RoutineSummary }
  | { kind: 'move'; routine: RoutineSummary }
  | { kind: 'folder'; folder: Folder };

type Prompt = { kind: 'create' } | { kind: 'rename'; folder: Folder };

export default function TrainScreen() {
  const { t } = useTranslation();
  const scheme = useScheme();
  const hevy = useHevyRoutineImport();
  const { folders, routines } = useDbQuery(routineList, routineTables);
  const weightUnit = usePreferences((s) => s.weightUnit);
  const distanceUnit = usePreferences((s) => s.distanceUnit);
  const units = { weightUnit, distanceUnit };
  const start = useRoutineDraft((s) => s.start);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  const newRoutine = (folderId: string | null) => {
    start({ routineId: null, folderId, name: '', notes: '', exercises: [] });
    router.push('/routine/edit');
  };

  const openRoutine = (id: string) => {
    const draft = loadDraft(id, units);
    if (!draft) return;
    start(draft);
    router.push('/routine/edit');
  };

  const beginWorkout = (make: () => ActiveWorkout | null) => {
    const go = () => {
      const w = make();
      if (!w) return;
      useWorkout.getState().begin(w);
      prepareRestNotifications();
      router.push('/workout');
      startWatchWorkout();
    };
    if (!useWorkout.getState().workout) return go();
    Alert.alert(t('workout.activeTitle'), t('workout.activeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('workout.resume'), onPress: () => router.push('/workout') },
      {
        text: t('workout.discardAndStart'),
        style: 'destructive',
        onPress: () => {
          stopRest();
          useWorkout.getState().end();
          go();
        },
      },
    ]);
  };

  const startEmpty = () =>
    beginWorkout(() => ({
      routineId: null,
      name: t('workout.defaultName'),
      notes: '',
      startedAt: Date.now(),
      exercises: [],
    }));

  const startRoutine = (id: string) => beginWorkout(() => workoutFromRoutine(id, units));

  const { start: launch } = useLocalSearchParams<{ start?: string }>();
  const onLaunch = useEffectEvent((value: string) =>
    value === 'empty' ? startEmpty() : startRoutine(value),
  );
  useEffect(() => {
    if (!launch) return;
    router.setParams({ start: undefined });
    onLaunch(launch);
  }, [launch]);

  const confirmDeleteRoutine = (r: RoutineSummary) =>
    Alert.alert(t('train.deleteRoutineTitle', { name: r.name }), t('train.deleteRoutineBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteRoutine(r.id) },
    ]);

  const confirmDeleteFolder = (f: Folder) =>
    Alert.alert(t('train.deleteFolderTitle', { name: f.name }), t('train.deleteFolderBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteFolder(f.id) },
    ]);

  const sheetProps = ((): { title: string; actions: SheetAction[] } | null => {
    if (!sheet) return null;
    if (sheet.kind === 'routine') {
      const r = sheet.routine;
      return {
        title: r.name,
        actions: [
          {
            label: t('train.duplicate'),
            onPress: () => duplicateRoutine(r.id, t('train.copySuffix'), units),
          },
          {
            label: t('train.moveToFolder'),
            onPress: () => setSheet({ kind: 'move', routine: r }),
          },
          {
            label: t('train.deleteRoutine'),
            destructive: true,
            onPress: () => confirmDeleteRoutine(r),
          },
        ],
      };
    }
    if (sheet.kind === 'move') {
      const r = sheet.routine;
      return {
        title: t('train.moveTitle', { name: r.name }),
        actions: [{ id: null, name: t('train.noFolder') }, ...folders].map((f) => ({
          label: f.name,
          selected: r.folderId === f.id,
          onPress: () => moveRoutine(r.id, f.id),
        })),
      };
    }
    const f = sheet.folder;
    return {
      title: f.name,
      actions: [
        { label: t('train.newRoutineHere'), onPress: () => newRoutine(f.id) },
        { label: t('train.renameFolder'), onPress: () => setPrompt({ kind: 'rename', folder: f }) },
        {
          label: t('train.deleteFolder'),
          destructive: true,
          onPress: () => confirmDeleteFolder(f),
        },
      ],
    };
  })();

  const ungrouped = routines.filter((r) => r.folderId === null);
  const empty = routines.length === 0 && folders.length === 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('train.title') }} />
      <View className="gap-3 pt-2">
        <ActiveWorkoutBanner />
        <Pressable
          accessibilityRole="button"
          onPress={startEmpty}
          className="min-h-log flex-row items-center gap-3 rounded-lg bg-surface px-4 active:bg-surface-raised"
        >
          <Plus size={22} color={hex(scheme, 'foreground')} />
          <Text className="font-medium text-body text-foreground">{t('train.startEmpty')}</Text>
        </Pressable>
      </View>
      {empty ? (
        <EmptyState
          title={t('train.emptyTitle')}
          body={t('train.emptyBody')}
          action={
            <View className="gap-3">
              <Button
                label={t('train.newRoutine')}
                variant="secondary"
                size="lg"
                onPress={() => newRoutine(null)}
              />
              <Button
                label={t('train.importHevy')}
                variant="secondary"
                size="lg"
                onPress={hevy.open}
              />
            </View>
          }
        />
      ) : (
        <View className="gap-4 pb-10 pt-6">
          <View className="flex-row items-center justify-between">
            <Text accessibilityRole="header" className="font-semibold text-title-2 text-foreground">
              {t('train.routines')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('train.newFolder')}
              onPress={() => setPrompt({ kind: 'create' })}
              className="min-h-touch min-w-touch items-center justify-center rounded-full active:bg-surface-raised"
            >
              <FolderSimplePlus size={26} color={hex(scheme, 'foreground')} />
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label={t('train.newRoutine')}
                variant="secondary"
                icon={<ClipboardText size={22} color={hex(scheme, 'foreground')} />}
                onPress={() => newRoutine(null)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('train.importHevy')}
                variant="secondary"
                icon={<DownloadSimple size={22} color={hex(scheme, 'foreground')} />}
                onPress={hevy.open}
              />
            </View>
          </View>

          {ungrouped.length ? (
            <Section title={t('train.myRoutines', { count: ungrouped.length })}>
              {ungrouped.map((r) => (
                <RoutineCard
                  key={r.id}
                  routine={r}
                  onPress={() => openRoutine(r.id)}
                  onStart={() => startRoutine(r.id)}
                  onMore={() => setSheet({ kind: 'routine', routine: r })}
                />
              ))}
            </Section>
          ) : null}

          {folders.map((f) => {
            const items = routines.filter((r) => r.folderId === f.id);
            return (
              <Section
                key={f.id}
                title={`${f.name} (${items.length})`}
                moreLabel={t('train.moreOptions', { name: f.name })}
                onMore={() => setSheet({ kind: 'folder', folder: f })}
              >
                {items.length ? (
                  items.map((r) => (
                    <RoutineCard
                      key={r.id}
                      routine={r}
                      onPress={() => openRoutine(r.id)}
                      onStart={() => startRoutine(r.id)}
                      onMore={() => setSheet({ kind: 'routine', routine: r })}
                    />
                  ))
                ) : (
                  <Text className="font-regular text-callout text-muted-foreground">
                    {t('train.folderEmpty')}
                  </Text>
                )}
              </Section>
            );
          })}
        </View>
      )}

      {hevy.element}
      <ActionSheet
        visible={sheetProps !== null}
        title={sheetProps?.title}
        actions={sheetProps?.actions ?? []}
        onClose={() => setSheet(null)}
      />
      {prompt ? (
        <TextPrompt
          title={t(prompt.kind === 'create' ? 'train.newFolder' : 'train.renameFolder')}
          label={t('train.folderName')}
          initial={prompt.kind === 'rename' ? prompt.folder.name : ''}
          confirmLabel={t(prompt.kind === 'create' ? 'train.createFolder' : 'common.save')}
          onClose={() => setPrompt(null)}
          onSubmit={(name) =>
            prompt.kind === 'create' ? createFolder(name) : renameFolder(prompt.folder.id, name)
          }
        />
      ) : null}
    </Screen>
  );
}

function MoreButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useScheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      className="min-h-touch min-w-touch items-center justify-center rounded-full active:bg-surface-raised"
    >
      <DotsThree size={24} weight="bold" color={hex(scheme, 'muted-foreground')} />
    </Pressable>
  );
}

function Section({
  title,
  moreLabel,
  onMore,
  children,
}: {
  title: string;
  moreLabel?: string;
  onMore?: () => void;
  children: ReactNode;
}) {
  const scheme = useScheme();
  const [open, setOpen] = useState(true);
  const Caret = open ? CaretDown : CaretRight;
  return (
    <View className="gap-3">
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          className="min-h-touch flex-1 flex-row items-center gap-2"
        >
          <Caret size={18} weight="fill" color={hex(scheme, 'muted-foreground')} />
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            className="flex-1 font-medium text-body text-muted-foreground"
          >
            {title}
          </Text>
        </Pressable>
        {onMore && moreLabel ? <MoreButton label={moreLabel} onPress={onMore} /> : null}
      </View>
      {open ? children : null}
    </View>
  );
}

function ActiveWorkoutBanner() {
  const { t } = useTranslation();
  const workout = useWorkout((s) => s.workout);
  const glass = useGlass();
  const now = useNow(1000, workout !== null);
  if (!workout || glass) return null;
  const elapsed = formatElapsed(now - workout.startedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('train.resumeLabel', { name: workout.name, time: elapsed })}
      onPress={() => router.push('/workout')}
      className="flex-row items-center justify-between gap-3 rounded-lg border border-primary-text bg-primary/15 px-4 py-3 active:opacity-80"
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-medium text-footnote text-primary-text">{t('train.inProgress')}</Text>
        <Text numberOfLines={1} className="font-semibold text-headline text-foreground">
          {workout.name} · {elapsed}
        </Text>
      </View>
      <Text className="font-semibold text-body text-primary-text">{t('workout.resume')}</Text>
    </Pressable>
  );
}

function RoutineCard({
  routine,
  onPress,
  onStart,
  onMore,
}: {
  routine: RoutineSummary;
  onPress: () => void;
  onStart: () => void;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  const displayName = useExerciseName();
  return (
    <View className="rounded-lg bg-surface">
      <View className="flex-row">
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('train.editHint')}
          onPress={onPress}
          className="flex-1 gap-1 rounded-tl-lg pb-3 pl-4 pt-4 active:bg-surface-raised"
        >
          <Text numberOfLines={1} className="font-semibold text-headline text-foreground">
            {routine.name}
          </Text>
          <Text numberOfLines={2} className="font-regular text-body text-muted-foreground">
            {routine.exercises.length
              ? routine.exercises.map(displayName).join(', ')
              : t('train.noExercises')}
          </Text>
        </Pressable>
        <View className="pr-2 pt-2">
          <MoreButton label={t('train.moreOptions', { name: routine.name })} onPress={onMore} />
        </View>
      </View>
      <View className="px-4 pb-4">
        <Button
          label={t('train.startRoutine')}
          accessibilityLabel={t('train.startRoutineLabel', { name: routine.name })}
          onPress={onStart}
        />
      </View>
    </View>
  );
}

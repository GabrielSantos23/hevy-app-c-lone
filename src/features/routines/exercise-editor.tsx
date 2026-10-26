import { Check, DotsThree, NotePencil, Plus, Timer, X } from 'phosphor-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { Button } from '@/components/ui/button';
import { type SetType, setTypes } from '@/db/schema';
import { useExerciseName } from '@/features/exercises/display';
import { draftField, type SetField, setFields } from '@/features/exercises/fields';
import { ExerciseThumb } from '@/features/exercises/media';
import { setHints } from '@/features/workouts/complete-set';
import { formatDurationWords } from '@/features/workouts/stats';
import { formatDuration } from '@/lib/units';
import type { DraftExercise, DraftSet, ExerciseActions } from '@/stores/exercise-draft';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { type SetValues, toDraftSet } from './convert';

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const RPE_OPTIONS = ['6', '7', '7.5', '8', '8.5', '9', '9.5', '10'];

const setTypeColor: Record<SetType, string> = {
  normal: 'text-foreground',
  warmup: 'text-set-warmup',
  dropset: 'text-set-dropset',
  failure: 'text-set-failure',
};

type WorkoutProps = {
  previous: Record<string, SetValues[]>;
  onToggleDone: (entry: DraftExercise, set: DraftSet, hints: Partial<DraftSet>) => void;
};

type EditorProps = {
  exercises: DraftExercise[];
  actions: ExerciseActions;
  workout?: WorkoutProps;
};

type SetTarget = { entry: DraftExercise; set: DraftSet; label: string };

export function ExerciseEditor({ exercises, actions, workout }: EditorProps) {
  const { t } = useTranslation();
  const [exerciseMenu, setExerciseMenu] = useState<DraftExercise | null>(null);
  const [setMenu, setSetMenu] = useState<SetTarget | null>(null);
  const [rpeMenu, setRpeMenu] = useState<SetTarget | null>(null);
  const [restMenu, setRestMenu] = useState<DraftExercise | null>(null);
  const rpeEnabled = usePreferences((s) => s.rpeEnabled);

  const exerciseActionsFor = (e: DraftExercise): SheetAction[] => {
    const i = exercises.findIndex((x) => x.key === e.key);
    const isLast = i === exercises.length - 1;
    return [
      ...(i > 0
        ? [{ label: t('routineEditor.moveUp'), onPress: () => actions.moveExercise(e.key, -1) }]
        : []),
      ...(!isLast
        ? [{ label: t('routineEditor.moveDown'), onPress: () => actions.moveExercise(e.key, 1) }]
        : []),
      ...(e.supersetGroup !== null
        ? [
            {
              label: t('routineEditor.leaveSuperset'),
              onPress: () => actions.toggleSuperset(e.key),
            },
          ]
        : !isLast
          ? [
              {
                label: t('routineEditor.supersetNext'),
                onPress: () => actions.toggleSuperset(e.key),
              },
            ]
          : []),
      {
        label: t('routineEditor.removeExercise'),
        destructive: true,
        onPress: () => actions.removeExercise(e.key),
      },
    ];
  };

  const setActionsFor = ({ entry, set, label }: SetTarget): SheetAction[] => [
    ...setTypes.map((type) => ({
      label: t(`setTypes.${type}Name`),
      selected: set.setType === type,
      onPress: () => actions.updateSet(entry.key, set.key, { setType: type }),
    })),
    ...(rpeEnabled
      ? [
          {
            label: set.rpe
              ? t('routineEditor.rpeValue', { rpe: set.rpe })
              : t('routineEditor.addRpe'),
            onPress: () => setRpeMenu({ entry, set, label }),
          },
        ]
      : []),
    ...(entry.sets.length > 1
      ? [
          {
            label: t('routineEditor.removeSet', { label }),
            destructive: true,
            onPress: () => actions.removeSet(entry.key, set.key),
          },
        ]
      : []),
  ];

  const rpeActionsFor = ({ entry, set }: SetTarget): SheetAction[] => [
    ...RPE_OPTIONS.map((rpe) => ({
      label: rpe,
      selected: set.rpe === rpe,
      onPress: () => actions.updateSet(entry.key, set.key, { rpe }),
    })),
    ...(set.rpe
      ? [
          {
            label: t('routineEditor.clearRpe'),
            onPress: () => actions.updateSet(entry.key, set.key, { rpe: '' }),
          },
        ]
      : []),
  ];

  return (
    <>
      {exercises.map((e) => (
        <ExerciseCard
          key={e.key}
          entry={e}
          actions={actions}
          workout={workout}
          onMenu={() => setExerciseMenu(e)}
          onRestMenu={() => setRestMenu(e)}
          onSetMenu={(set, label) => setSetMenu({ entry: e, set, label })}
        />
      ))}
      <ActionSheet
        visible={exerciseMenu !== null}
        title={exerciseMenu?.name}
        actions={exerciseMenu ? exerciseActionsFor(exerciseMenu) : []}
        onClose={() => setExerciseMenu(null)}
      />
      <ActionSheet
        visible={setMenu !== null}
        title={setMenu ? t('routineEditor.setTitle', { label: setMenu.label }) : undefined}
        actions={setMenu ? setActionsFor(setMenu) : []}
        onClose={() => setSetMenu(null)}
      />
      <ActionSheet
        visible={restMenu !== null}
        title={t('routineEditor.restTitle')}
        actions={
          restMenu
            ? REST_OPTIONS.map((sec) => ({
                label: sec ? formatDuration(sec) : t('routineEditor.restOff'),
                selected: restMenu.restSeconds === sec,
                onPress: () => actions.setRest(restMenu.key, sec),
              }))
            : []
        }
        onClose={() => setRestMenu(null)}
      />
      <ActionSheet
        visible={rpeMenu !== null}
        title={t('routineEditor.rpeTitle')}
        actions={rpeMenu ? rpeActionsFor(rpeMenu) : []}
        onClose={() => setRpeMenu(null)}
      />
    </>
  );
}

function ExerciseCard({
  entry,
  actions,
  workout,
  onMenu,
  onRestMenu,
  onSetMenu,
}: {
  entry: DraftExercise;
  actions: ExerciseActions;
  workout?: WorkoutProps;
  onMenu: () => void;
  onRestMenu: () => void;
  onSetMenu: (set: DraftSet, label: string) => void;
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const displayName = useExerciseName();
  const weightUnit = usePreferences((s) => s.weightUnit);
  const distanceUnit = usePreferences((s) => s.distanceUnit);
  const [noteOpen, setNoteOpen] = useState(entry.notes.length > 0);
  const name = displayName(entry);
  const fields = setFields[entry.type];
  const inSuperset = entry.supersetGroup !== null;
  const short = entry.type === 'short_distance_weight';
  const previous = workout?.previous[entry.exerciseId] ?? [];

  const columnLabel = (f: SetField) => {
    if (f === 'weight')
      return t(
        entry.type === 'bodyweight_reps'
          ? 'routineEditor.columns.addedWeight'
          : entry.type === 'bodyweight_assisted_reps'
            ? 'routineEditor.columns.assistWeight'
            : 'routineEditor.columns.weight',
        { unit: weightUnit },
      );
    if (f === 'distance') return t('routineEditor.columns.distance', { unit: distanceUnit });
    if (f === 'custom')
      return t(
        entry.type === 'steps_duration'
          ? 'routineEditor.columns.steps'
          : 'routineEditor.columns.floors',
      );
    return t(`routineEditor.columns.${f}`);
  };

  let normalCount = 0;
  const labels = entry.sets.map((s) =>
    s.setType === 'warmup'
      ? t('setTypes.warmupShort')
      : s.setType === 'dropset'
        ? t('setTypes.dropsetShort')
        : s.setType === 'failure'
          ? t('setTypes.failureShort')
          : String(++normalCount),
  );

  return (
    <View className={`gap-3 pb-2 ${inSuperset ? 'border-l-4 border-l-superset pl-3' : ''}`}>
      <View className="flex-row items-center gap-3">
        <ExerciseThumb exerciseId={entry.exerciseId} />
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={2} className="font-semibold text-headline text-primary-text">
            {name}
          </Text>
          {inSuperset ? (
            <Text className="font-medium text-footnote text-superset">
              {t('routineEditor.superset')} {entry.supersetGroup}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('routineEditor.exerciseOptions', { name })}
          onPress={onMenu}
          className="min-h-touch min-w-touch items-center justify-center rounded-full active:bg-surface-raised"
        >
          <DotsThree size={24} weight="bold" color={hex(scheme, 'muted-foreground')} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <ChipButton
          icon={<Timer size={18} color={hex(scheme, 'foreground')} />}
          label={t('routineEditor.restChip', {
            time: entry.restSeconds
              ? formatDurationWords(entry.restSeconds)
              : t('routineEditor.restOff'),
          })}
          onPress={onRestMenu}
        />
        {noteOpen ? null : (
          <ChipButton
            icon={<NotePencil size={18} color={hex(scheme, 'foreground')} />}
            label={t('routineEditor.noteChip')}
            onPress={() => setNoteOpen(true)}
          />
        )}
      </View>

      {noteOpen ? (
        <TextInput
          accessibilityLabel={t('routineEditor.exerciseNote')}
          placeholder={t('routineEditor.exerciseNote')}
          placeholderTextColor={hex(scheme, 'muted-foreground')}
          value={entry.notes}
          onChangeText={(v) => actions.setExerciseNotes(entry.key, v)}
          autoFocus={entry.notes.length === 0}
          multiline
          className="min-h-touch rounded-md bg-surface-raised px-3 py-2 font-regular text-callout text-foreground"
        />
      ) : null}

      <View className="gap-2">
        <View
          className="flex-row items-center gap-2"
          importantForAccessibility="no-hide-descendants"
        >
          <Text className="w-12 text-center font-medium text-caption uppercase text-muted-foreground">
            {t('routineEditor.set')}
          </Text>
          {workout ? (
            <Text className="flex-1 text-center font-medium text-caption uppercase text-muted-foreground">
              {t('workout.previous')}
            </Text>
          ) : null}
          {fields.map((f) => (
            <Text
              key={f}
              className="flex-1 text-center font-medium text-caption uppercase text-muted-foreground"
            >
              {columnLabel(f)}
            </Text>
          ))}
          <View className="w-11" />
        </View>
        {entry.sets.map((s, i) => {
          const prev = previous[i];
          const prevDraft = prev ? toDraftSet(prev, { weightUnit, distanceUnit }, short) : null;
          const hints = setHints(prevDraft, s);
          return (
            <SetRow
              key={s.key}
              set={s}
              label={labels[i]}
              fields={fields}
              columnLabel={columnLabel}
              hints={hints}
              previousText={
                workout
                  ? prevDraft
                    ? fields
                        .map((f) =>
                          f === 'weight' && prevDraft.weight
                            ? `${prevDraft.weight}${weightUnit}`
                            : prevDraft[draftField[f]],
                        )
                        .filter(Boolean)
                        .join(' x ')
                    : '–'
                  : undefined
              }
              onLabelPress={() => onSetMenu(s, labels[i])}
              onChange={(patch) => actions.updateSet(entry.key, s.key, patch)}
              trailing={
                workout ? (
                  <DoneButton
                    done={s.done}
                    label={labels[i]}
                    onPress={() => workout.onToggleDone(entry, s, hints)}
                  />
                ) : entry.sets.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('routineEditor.removeSet', { label: labels[i] })}
                    onPress={() => actions.removeSet(entry.key, s.key)}
                    className="min-h-touch w-11 items-center justify-center rounded-full active:bg-surface-raised"
                  >
                    <X size={18} color={hex(scheme, 'muted-foreground')} />
                  </Pressable>
                ) : (
                  <View className="w-11" />
                )
              }
            />
          );
        })}
      </View>

      <Button
        label={t('routineEditor.addSet')}
        icon={<Plus size={18} weight="bold" color={hex(scheme, 'foreground')} />}
        variant="tonal"
        onPress={() => actions.addSet(entry.key)}
      />
    </View>
  );
}

function SetRow({
  set,
  label,
  fields,
  columnLabel,
  hints,
  previousText,
  onLabelPress,
  onChange,
  trailing,
}: {
  set: DraftSet;
  label: string;
  fields: SetField[];
  columnLabel: (f: SetField) => string;
  hints: Partial<DraftSet>;
  previousText?: string;
  onLabelPress: () => void;
  onChange: (patch: Partial<DraftSet>) => void;
  trailing: ReactNode;
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const typeName = t(`setTypes.${set.setType}`);
  const setName = t('routineEditor.setLabel', { label, type: typeName });

  return (
    <View
      className={`-mx-4 flex-row items-center gap-2 px-4 py-1 ${set.done ? 'bg-success/30' : ''}`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={set.rpe ? `${setName}, RPE ${set.rpe}` : setName}
        accessibilityHint={t('routineEditor.setTypeHint')}
        onPress={onLabelPress}
        className={`min-h-touch w-12 items-center justify-center rounded-md active:opacity-80 ${
          set.done ? '' : 'bg-surface-raised'
        }`}
      >
        <Text className={`font-semibold text-body ${setTypeColor[set.setType]}`}>{label}</Text>
        {set.rpe ? (
          <Text className="font-medium text-caption text-muted-foreground">@{set.rpe}</Text>
        ) : null}
      </Pressable>
      {previousText !== undefined ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="flex-1 text-center font-regular text-footnote text-muted-foreground"
        >
          {previousText}
        </Text>
      ) : null}
      {fields.map((f) => {
        const key = draftField[f];
        return (
          <TextInput
            key={f}
            accessibilityLabel={`${columnLabel(f)}, ${setName}`}
            accessibilityHint={
              f === 'reps'
                ? t('routineEditor.repsHint')
                : f === 'duration'
                  ? t('routineEditor.durationHint')
                  : undefined
            }
            value={set[key]}
            onChangeText={(v) => onChange({ [key]: v })}
            keyboardType={
              f === 'reps' || f === 'duration' ? 'numbers-and-punctuation' : 'decimal-pad'
            }
            placeholder={hints[key] || '–'}
            placeholderTextColor={hex(scheme, 'muted-foreground')}
            selectTextOnFocus
            className={`min-h-touch flex-1 rounded-md border px-2 text-center font-medium text-body text-foreground ${
              set.done ? 'border-transparent' : 'border-border-strong'
            }`}
          />
        );
      })}
      {trailing}
    </View>
  );
}

function DoneButton({
  done,
  label,
  onPress,
}: {
  done: boolean;
  label: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={t('workout.completeSet', { label })}
      onPress={onPress}
      className={`min-h-touch w-11 items-center justify-center rounded-md ${
        done ? 'bg-success' : 'bg-surface-raised'
      }`}
    >
      <Check
        size={20}
        weight="bold"
        color={hex(scheme, done ? 'on-primary' : 'muted-foreground')}
      />
    </Pressable>
  );
}

function ChipButton({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-2 rounded-md bg-surface-raised px-3 active:opacity-80"
    >
      {icon}
      <Text className="font-medium text-callout text-foreground">{label}</Text>
    </Pressable>
  );
}

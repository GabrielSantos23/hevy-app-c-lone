import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { CaretRight, CheckCircle, CircleIcon } from 'phosphor-react-native';
import { memo, type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useExerciseFilters } from '@/stores/exercise-filters';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { useExerciseName } from './display';
import { FilterButtons } from './filter-sheet';
import { ExerciseThumb } from './media';
import { type ExerciseListItem, exerciseListQuery } from './queries';

const ROW_HEIGHT = 68;

type ExerciseListProps = {
  onSelect: (item: ExerciseListItem) => void;
  header?: ReactElement;
  selectedIds?: ReadonlySet<string>;
};

export function ExerciseList({ onSelect, header, selectedIds }: ExerciseListProps) {
  const { t } = useTranslation();
  const { search, muscle, equipment, clear } = useExerciseFilters();
  const query = useMemo(
    () => exerciseListQuery({ search, muscle, equipment }),
    [search, muscle, equipment],
  );
  // data starts as [] before the first result, so updatedAt tells loading from empty.
  const { data, updatedAt } = useLiveQuery(query, [search, muscle, equipment]);
  const filtered = muscle !== null || equipment !== null;

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-background"
      contentContainerClassName="pb-8"
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      ListHeaderComponent={
        <View>
          <FilterButtons />
          {header}
        </View>
      }
      ListEmptyComponent={
        updatedAt === undefined ? undefined : (
          <EmptyState
            title={t('exercises.noResultsTitle')}
            body={t(filtered ? 'exercises.noResultsFilteredBody' : 'exercises.noResultsBody')}
            action={
              filtered ? (
                <Button label={t('exercises.clearFilters')} variant="secondary" onPress={clear} />
              ) : undefined
            }
          />
        )
      }
      extraData={selectedIds}
      renderItem={({ item }) => (
        <ExerciseRow
          item={item}
          onSelect={onSelect}
          selected={selectedIds ? selectedIds.has(item.id) : undefined}
        />
      )}
    />
  );
}

export const ExerciseRow = memo(function ExerciseRow({
  item,
  onSelect,
  selected,
}: {
  item: ExerciseListItem;
  onSelect: (item: ExerciseListItem) => void;
  selected?: boolean;
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const displayName = useExerciseName();
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'checkbox'}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      onPress={() => onSelect(item)}
      className={`h-[68px] flex-row items-center gap-3 border-b border-border px-4 ${
        selected ? 'bg-primary/15' : 'active:bg-surface'
      }`}
    >
      <ExerciseThumb exerciseId={item.id} />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-medium text-body text-foreground">
          {displayName(item)}
        </Text>
        <Text numberOfLines={1} className="font-regular text-footnote text-muted-foreground">
          {t(`muscles.${item.primaryMuscle}`)} · {t(`equipment.${item.equipment}`)}
          {item.isCustom ? ` · ${t('exercises.custom')}` : ''}
        </Text>
      </View>
      {selected === undefined ? (
        <CaretRight size={18} color={hex(scheme, 'muted-foreground')} />
      ) : selected ? (
        <CheckCircle size={26} weight="fill" color={hex(scheme, 'primary-text')} />
      ) : (
        <CircleIcon size={26} color={hex(scheme, 'muted-foreground')} />
      )}
    </Pressable>
  );
});

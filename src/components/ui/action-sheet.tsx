import { Check } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

import { Sheet } from './sheet';

export type SheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
};

type ActionSheetProps = {
  title?: string;
  actions: SheetAction[];
  visible: boolean;
  onClose: () => void;
};

export function ActionSheet({ title, actions, visible, onClose }: ActionSheetProps) {
  const { t } = useTranslation();
  const scheme = useScheme();
  return (
    <Sheet title={title} visible={visible} onClose={onClose}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          accessibilityState={a.selected === undefined ? undefined : { selected: a.selected }}
          onPress={() => {
            onClose();
            a.onPress();
          }}
          className="min-h-log flex-row items-center justify-between rounded-md px-4 active:bg-surface"
        >
          <Text
            className={`font-medium text-body ${
              a.destructive
                ? 'text-destructive-text'
                : a.selected
                  ? 'text-primary-text'
                  : 'text-foreground'
            }`}
          >
            {a.label}
          </Text>
          {a.selected ? (
            <Check size={20} weight="bold" color={hex(scheme, 'primary-text')} />
          ) : null}
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        className="mt-1 min-h-log items-center justify-center rounded-md border border-border-strong active:bg-surface"
      >
        <Text className="font-semibold text-body text-foreground">{t('common.cancel')}</Text>
      </Pressable>
    </Sheet>
  );
}

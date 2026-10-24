import { CaretDown, Check } from 'phosphor-react-native';
import { Pressable, Text } from 'react-native';

import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

type ChipProps = {
  label: string;
  selected?: boolean;
  menu?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
};

export function Chip({
  label,
  selected = false,
  menu = false,
  onPress,
  accessibilityHint,
}: ChipProps) {
  const scheme = useScheme();
  const color = hex(scheme, selected ? 'primary-text' : 'foreground');
  return (
    <Pressable
      accessibilityRole={menu ? 'button' : 'checkbox'}
      accessibilityState={menu ? undefined : { checked: selected }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={4}
      className={`min-h-touch flex-row items-center gap-1.5 rounded-full border px-4 ${
        selected ? 'border-primary-text bg-primary/15' : 'border-border-strong bg-surface-raised'
      }`}
    >
      {selected && !menu ? <Check size={16} color={color} weight="bold" /> : null}
      <Text
        className={`font-medium text-callout ${selected ? 'text-primary-text' : 'text-foreground'}`}
      >
        {label}
      </Text>
      {menu ? <CaretDown size={14} color={color} weight="bold" /> : null}
    </Pressable>
  );
}

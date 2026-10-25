import { GlassView } from 'expo-glass-effect';
import { CaretDown, Check } from 'phosphor-react-native';
import { Pressable, Text } from 'react-native';

import { useGlass } from '@/lib/use-glass';

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
  const glass = useGlass();
  const tinted = glass && selected;
  const color = hex(scheme, tinted ? 'on-primary' : selected ? 'primary-text' : 'foreground');
  const chip = (
    <Pressable
      accessibilityRole={menu ? 'button' : 'checkbox'}
      accessibilityState={menu ? undefined : { checked: selected }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={4}
      className={`min-h-touch flex-row items-center gap-1.5 rounded-full px-4 ${
        glass
          ? 'active:opacity-80'
          : selected
            ? 'border border-primary-text bg-primary/15'
            : 'border border-border-strong bg-surface-raised'
      }`}
    >
      {selected && !menu ? <Check size={16} color={color} weight="bold" /> : null}
      <Text
        className={`font-medium text-callout ${
          tinted ? 'text-on-primary' : selected ? 'text-primary-text' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
      {menu ? <CaretDown size={14} color={color} weight="bold" /> : null}
    </Pressable>
  );
  if (!glass) return chip;
  return (
    <GlassView
      isInteractive
      colorScheme={scheme}
      tintColor={selected ? hex(scheme, 'primary') : undefined}
      style={{ borderRadius: 999 }}
    >
      {chip}
    </GlassView>
  );
}

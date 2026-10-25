import { GlassView } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, Text } from 'react-native';

import { useGlass } from '@/lib/use-glass';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

type Variant = 'primary' | 'secondary' | 'destructive' | 'tonal' | 'tonal-destructive';
type Size = 'md' | 'lg';

const containers: Record<Variant, string> = {
  primary: 'bg-primary active:opacity-90',
  secondary: 'bg-surface-raised border border-border-strong active:bg-surface',
  destructive: 'bg-surface border border-border active:bg-surface-raised',
  tonal: 'bg-surface-raised active:opacity-80',
  'tonal-destructive': 'bg-surface-raised active:opacity-80',
};

const labels: Record<Variant, string> = {
  primary: 'text-on-primary',
  secondary: 'text-foreground',
  destructive: 'text-destructive-text',
  tonal: 'text-foreground',
  'tonal-destructive': 'text-destructive-text',
};

const sizes: Record<Size, string> = {
  md: 'min-h-touch px-4',
  lg: 'min-h-log px-5',
};

type ButtonProps = Omit<PressableProps, 'children'> & {
  pill?: boolean;
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  pill = false,
  ...rest
}: ButtonProps) {
  const glass = useGlass();
  const scheme = useScheme();
  const content = (
    <>
      {icon}
      <Text className={`font-semibold text-headline ${labels[variant]}`}>{label}</Text>
    </>
  );
  if (glass)
    return (
      <GlassView
        isInteractive
        colorScheme={scheme}
        tintColor={variant === 'primary' ? hex(scheme, 'primary') : undefined}
        style={{ borderRadius: pill ? 999 : 12, opacity: rest.disabled ? 0.5 : 1 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!rest.disabled }}
          className={`flex-row items-center justify-center gap-2 active:opacity-80 ${sizes[size]}`}
          {...rest}
        >
          {content}
        </Pressable>
      </GlassView>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!rest.disabled }}
      className={`flex-row items-center justify-center gap-2 ${pill ? 'rounded-full' : 'rounded-md'} ${containers[variant]} ${sizes[size]} ${
        rest.disabled ? 'opacity-50' : ''
      }`}
      {...rest}
    >
      {content}
    </Pressable>
  );
}

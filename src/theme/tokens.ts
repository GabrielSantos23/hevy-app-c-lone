export type ColorScheme = 'light' | 'dark';

export const colorTokens = [
  'background',
  'surface',
  'surface-raised',
  'foreground',
  'muted-foreground',
  'border',
  'border-strong',
  'primary',
  'on-primary',
  'primary-text',
  'destructive',
  'on-destructive',
  'destructive-text',
  'success',
  'warning',
  'set-warmup',
  'set-dropset',
  'set-failure',
  'superset',
] as const;

export type ColorToken = (typeof colorTokens)[number];

type Rgb = readonly [number, number, number];

export const palette: Record<ColorScheme, Record<ColorToken, Rgb>> = {
  dark: {
    background: [0, 0, 0],
    surface: [22, 22, 24],
    'surface-raised': [38, 38, 41],
    foreground: [255, 255, 255],
    'muted-foreground': [152, 152, 158],
    border: [44, 44, 46],
    'border-strong': [84, 84, 88],
    primary: [0, 113, 227],
    'on-primary': [255, 255, 255],
    'primary-text': [64, 156, 255],
    destructive: [215, 40, 33],
    'on-destructive': [255, 255, 255],
    'destructive-text': [255, 99, 89],
    success: [52, 199, 89],
    warning: [255, 204, 0],
    'set-warmup': [255, 204, 0],
    'set-dropset': [191, 135, 255],
    'set-failure': [255, 99, 89],
    superset: [100, 210, 255],
  },
  light: {
    background: [242, 242, 247],
    surface: [255, 255, 255],
    'surface-raised': [229, 229, 234],
    foreground: [0, 0, 0],
    'muted-foreground': [92, 92, 97],
    border: [216, 216, 220],
    'border-strong': [130, 130, 135],
    primary: [0, 102, 204],
    'on-primary': [255, 255, 255],
    'primary-text': [0, 94, 189],
    destructive: [197, 30, 33],
    'on-destructive': [255, 255, 255],
    'destructive-text': [175, 22, 26],
    success: [0, 120, 64],
    warning: [157, 99, 0],
    'set-warmup': [157, 99, 0],
    'set-dropset': [109, 71, 184],
    'set-failure': [175, 22, 26],
    superset: [0, 110, 140],
  },
};

export const hex = (scheme: ColorScheme, token: ColorToken): string =>
  `#${palette[scheme][token].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

// Tints liquid glass with the surface so text stays readable over busy content.
export const glassTint = (scheme: ColorScheme) => `${hex(scheme, 'surface')}B3`;

export const cssVars = (scheme: ColorScheme): Record<`--color-${ColorToken}`, string> =>
  Object.fromEntries(
    colorTokens.map((t) => [`--color-${t}`, palette[scheme][t].join(' ')]),
  ) as Record<`--color-${ColorToken}`, string>;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 } as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typeScale = {
  display: [56, 60],
  'title-1': [28, 34],
  'title-2': [22, 28],
  headline: [17, 22],
  body: [17, 24],
  callout: [15, 20],
  footnote: [13, 18],
  caption: [12, 16],
} as const;

export const touch = { min: 44, log: 56 } as const;

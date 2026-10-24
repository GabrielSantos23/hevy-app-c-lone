export type ColorScheme = 'light' | 'dark' | 'workout';

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
    background: [17, 15, 13],
    surface: [28, 26, 24],
    'surface-raised': [39, 36, 33],
    foreground: [243, 242, 238],
    'muted-foreground': [169, 164, 156],
    border: [48, 45, 43],
    'border-strong': [116, 113, 108],
    primary: [202, 69, 0],
    'on-primary': [255, 253, 250],
    'primary-text': [250, 135, 70],
    destructive: [204, 40, 39],
    'on-destructive': [255, 251, 250],
    'destructive-text': [246, 109, 103],
    success: [75, 198, 128],
    warning: [237, 179, 69],
    'set-warmup': [237, 179, 69],
    'set-dropset': [171, 145, 242],
    'set-failure': [246, 109, 103],
    superset: [70, 198, 205],
  },
  workout: {
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
    background: [248, 246, 244],
    surface: [255, 255, 255],
    'surface-raised': [242, 240, 237],
    foreground: [26, 24, 21],
    'muted-foreground': [95, 90, 84],
    border: [227, 225, 222],
    'border-strong': [137, 133, 129],
    primary: [198, 65, 0],
    'on-primary': [255, 253, 250],
    'primary-text': [181, 57, 0],
    destructive: [197, 30, 33],
    'on-destructive': [255, 251, 250],
    'destructive-text': [183, 25, 28],
    success: [0, 120, 64],
    warning: [157, 99, 0],
    'set-warmup': [157, 99, 0],
    'set-dropset': [109, 71, 184],
    'set-failure': [183, 25, 28],
    superset: [0, 114, 119],
  },
};

export const hex = (scheme: ColorScheme, token: ColorToken): string =>
  `#${palette[scheme][token].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

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

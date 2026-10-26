import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

import type { Muscle } from '@/db/schema';
import { palette } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

const slugs: Partial<Record<Muscle, Slug[]>> = {
  abdominals: ['abs', 'obliques'],
  abductors: ['gluteal'],
  adductors: ['adductors'],
  biceps: ['biceps'],
  calves: ['calves'],
  chest: ['chest'],
  forearms: ['forearm'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  lats: ['upper-back'],
  lower_back: ['lower-back'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  shoulders: ['deltoids'],
  traps: ['trapezius'],
  triceps: ['triceps'],
  upper_back: ['upper-back'],
};

const LEVELS = 3;

// The library's assets hardcode a dark color per part, so every part gets an explicit color.
const allSlugs: Slug[] = [
  'abs',
  'adductors',
  'ankles',
  'biceps',
  'calves',
  'chest',
  'deltoids',
  'feet',
  'forearm',
  'gluteal',
  'hamstring',
  'hands',
  'hair',
  'head',
  'knees',
  'lower-back',
  'neck',
  'obliques',
  'quadriceps',
  'tibialis',
  'trapezius',
  'triceps',
  'upper-back',
];

export function slugLevels(sets: Partial<Record<Muscle, number>>) {
  const max = Math.max(0, ...Object.values(sets));
  const levels = new Map<Slug, number>();
  for (const [m, n] of Object.entries(sets) as [Muscle, number][])
    for (const slug of n ? (slugs[m] ?? []) : [])
      levels.set(slug, Math.max(levels.get(slug) ?? 0, Math.ceil((n / max) * LEVELS)));
  return levels;
}

export function BodyMap({
  sets,
  height,
  side,
}: {
  sets: Partial<Record<Muscle, number>>;
  height: number;
  side?: 'front' | 'back';
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const worked = (Object.keys(sets) as Muscle[]).filter((m) => sets[m]);

  const intensity = slugLevels(sets);
  const [r, g, b] = palette[scheme].primary;
  const colors = [0.45, 0.7, 1].map((a) => `rgba(${r}, ${g}, ${b}, ${a})`);
  const fill = `rgb(${palette[scheme]['muted-foreground'].join(', ')})`;
  const data: ExtendedBodyPart[] = allSlugs.map((slug) =>
    intensity.has(slug) ? { slug, intensity: intensity.get(slug) } : { slug, color: fill },
  );
  const props = { data, colors, scale: height / 400, border: 'none', defaultFill: fill } as const;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        worked.length
          ? t('workout.bodyMapLabel', { muscles: worked.map((m) => t(`muscles.${m}`)).join(', ') })
          : t('workout.bodyMapEmpty')
      }
    >
      <View importantForAccessibility="no-hide-descendants" className="flex-row">
        {side !== 'back' ? <Body {...props} side="front" /> : null}
        {side !== 'front' ? <Body {...props} side="back" /> : null}
      </View>
    </View>
  );
}

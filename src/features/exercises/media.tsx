import { Image } from 'expo-image';
import { Barbell } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

let generated: Record<string, number> = {};
try {
  generated = require('./media.generated').media;
} catch {}

const mediaFor = (exerciseId: string): number | undefined =>
  exerciseId.startsWith('seed:') ? generated[exerciseId.slice(5)] : undefined;

export function ExerciseThumb({ exerciseId }: { exerciseId: string }) {
  const scheme = useScheme();
  const media = mediaFor(exerciseId);
  return (
    <View
      accessible={false}
      className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white"
    >
      {media ? (
        <Image source={media} autoplay={false} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Barbell size={22} color={hex(scheme, 'muted-foreground')} weight="duotone" />
      )}
    </View>
  );
}

export function ExerciseAnimation({ exerciseId, label }: { exerciseId: string; label: string }) {
  const reducedMotion = useReducedMotion();
  const media = mediaFor(exerciseId);
  if (!media) return null;
  return (
    <View className="aspect-square w-full overflow-hidden rounded-lg bg-white">
      <Image
        source={media}
        autoplay={!reducedMotion}
        accessibilityLabel={label}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
    </View>
  );
}

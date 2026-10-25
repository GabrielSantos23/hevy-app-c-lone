import { GlassView } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlass } from '@/lib/use-glass';
import { useScheme } from '@/theme/theme-root';

type SheetProps = {
  title?: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Sheet({ title, visible, onClose, children }: SheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const glass = useGlass();
  const scheme = useScheme();
  const header = title ? (
    <Text
      accessibilityRole="header"
      numberOfLines={2}
      className="px-4 pb-2 pt-1 font-semibold text-headline text-foreground"
    >
      {title}
    </Text>
  ) : null;
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={onClose}
        className="flex-1 bg-black/50"
      />
      {glass ? (
        <View accessibilityViewIsModal style={{ paddingBottom: insets.bottom }} className="px-2">
          <GlassView colorScheme={scheme} style={{ borderRadius: 32 }}>
            <View className="gap-1 px-2 pb-3 pt-4">
              {header}
              {children}
            </View>
          </GlassView>
        </View>
      ) : (
        <View
          accessibilityViewIsModal
          style={{ paddingBottom: insets.bottom + 8 }}
          className="gap-1 rounded-t-lg bg-surface-raised px-2 pt-3"
        >
          {header}
          {children}
        </View>
      )}
    </Modal>
  );
}

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View className="items-center gap-2 px-4 py-12">
      <Text
        accessibilityRole="header"
        className="text-center font-semibold text-title-2 text-foreground"
      >
        {title}
      </Text>
      <Text className="text-center font-regular text-body text-muted-foreground">{body}</Text>
      {action ? <View className="mt-4 self-stretch">{action}</View> : null}
    </View>
  );
}

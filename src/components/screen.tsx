import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-8"
    >
      {children}
    </ScrollView>
  );
}

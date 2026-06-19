import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type Props = {
  title: string;
  onBack: () => void;
  rightAction?: ReactNode;
};

export function ScreenHeader({ title, onBack, rightAction }: Props) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
        <SymbolView
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          tintColor={SmartCartColors.text}
          size={22}
        />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightAction ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: SmartCartColors.text,
  },
  headerSpacer: { width: 22 },
});

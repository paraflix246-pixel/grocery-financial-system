import { StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  title: string;
  onBack?: () => void;
  fallbackHref?: Href;
  rightAction?: ReactNode;
};

export function ScreenHeader({ title, onBack, fallbackHref, rightAction }: Props) {
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} fallbackHref={fallbackHref} />
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
  headerSpacer: { width: 72 },
});

import { Platform, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useNavigation, useRouter, type Href } from 'expo-router';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  /** Used only when there is no navigation history (e.g. deep link). */
  fallbackHref?: Href;
  onPress?: () => void;
};

function canNavigateBack(navigation: { canGoBack: () => boolean }): boolean {
  if (navigation.canGoBack()) {
    return true;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
    return true;
  }
  return false;
}

export function BackButton({ fallbackHref = '/(tabs)', onPress }: Props) {
  const router = useRouter();
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (canNavigateBack(navigation as { canGoBack: () => boolean })) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <SymbolView
        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
        tintColor={SmartCartColors.text}
        size={22}
      />
      <Text style={styles.label}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 17,
    color: SmartCartColors.text,
  },
});

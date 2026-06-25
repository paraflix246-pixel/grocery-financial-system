import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useNavigation, usePathname, useRouter, type Href } from 'expo-router';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';
import { skipOpenLastListOnNextFocus } from '@/src/utils/listNavigationPrefs';

type Props = {
  /** Used only when there is no navigation history (e.g. deep link). */
  fallbackHref?: Href;
  onPress?: () => void;
  showLabel?: boolean;
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function canNavigateBack(navigation: { canGoBack: () => boolean }): boolean {
  if (navigation.canGoBack()) {
    return true;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
    return true;
  }
  return false;
}

export function navigateBack(
  navigation: { canGoBack: () => boolean },
  router: { back: () => void; replace: (href: Href) => void },
  fallbackHref: Href = '/(tabs)',
) {
  if (canNavigateBack(navigation)) {
    router.back();
    return;
  }
  router.replace(fallbackHref);
}

export function BackButton({
  fallbackHref = '/(tabs)',
  onPress,
  showLabel = true,
  tintColor = SmartCartColors.text,
  style,
}: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const isListDetail = pathname.startsWith('/list/') && pathname !== '/list/share';

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (isListDetail) {
      skipOpenLastListOnNextFocus();
      if (canNavigateBack(navigation as { canGoBack: () => boolean })) {
        router.back();
      } else {
        router.replace('/(tabs)/shopping-lists?browse=1' as never);
      }
      return;
    }
    navigateBack(navigation as { canGoBack: () => boolean }, router, fallbackHref);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={[styles.row, style]}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <SymbolView
        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
        tintColor={tintColor}
        size={22}
      />
      {showLabel ? <Text style={[styles.label, { color: tintColor }]}>Back</Text> : null}
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
  },
});

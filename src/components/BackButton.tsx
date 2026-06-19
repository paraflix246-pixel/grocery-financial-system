import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useNavigation, useRouter, type Href } from 'expo-router';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  fallbackHref?: Href;
  onPress?: () => void;
};

export function BackButton({ fallbackHref = '/(tabs)', onPress }: Props) {
  const router = useRouter();
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
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

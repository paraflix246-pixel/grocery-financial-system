import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type Props = {
  label: string;
  onPress?: () => void;
};

export function DateRangePill({ label, onPress }: Props) {
  return (
    <Pressable style={styles.pill} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
      <SymbolView
        name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
        tintColor={SmartCartColors.textSecondary}
        size={14}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: SmartCartColors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    marginTop: 8,
    ...SmartCartShadow.cardSoft,
  },
  text: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
});

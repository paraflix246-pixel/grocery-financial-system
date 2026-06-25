import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import {
  formatCartPriceSourceLabel,
  type StorePrice,
} from '@/src/services/priceComparisonService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  source: StorePrice['source'];
};

export function CartPriceSourceBadge({ source }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{formatCartPriceSourceLabel(source)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: SmartCartColors.background,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SmartCartColors.border,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    color: SmartCartColors.textMuted,
    letterSpacing: 0.2,
  },
});

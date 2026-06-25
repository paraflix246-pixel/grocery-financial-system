import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { RECEIPT_SAVE_REVIEW_HINT } from '@/src/utils/ocrLabels';

type Props = {
  /** Hide when another banner already nudges review (e.g. ReceiptScanWarnings). */
  visible?: boolean;
};

export function ReceiptSaveReviewHint({ visible = true }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <SymbolView
        name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
        tintColor={SmartCartColors.accentBlue}
        size={18}
      />
      <Text style={styles.message}>{RECEIPT_SAVE_REVIEW_HINT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SmartCartRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 18,
  },
});

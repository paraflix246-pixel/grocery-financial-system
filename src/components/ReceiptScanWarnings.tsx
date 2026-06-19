import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import type { ReceiptParseWarning } from '@/src/utils/receiptValidation';
import { warningMessage } from '@/src/utils/receiptValidation';

type Props = {
  warnings: ReceiptParseWarning[];
  onEdit?: () => void;
};

export function ReceiptScanWarnings({ warnings, onEdit }: Props) {
  if (warnings.length === 0) return null;

  const isCritical = warnings.some((w) =>
    ['ocr_fallback', 'ocr_empty', 'ocr_low_confidence', 'items_total_mismatch'].includes(w)
  );

  return (
    <View style={[styles.banner, isCritical ? styles.bannerCritical : styles.bannerInfo]}>
      <SymbolView
        name={{
          ios: isCritical ? 'exclamationmark.triangle.fill' : 'info.circle.fill',
          android: 'warning',
          web: 'warning',
        }}
        tintColor={isCritical ? SmartCartColors.accentOrange : SmartCartColors.primary}
        size={20}
      />
      <View style={styles.body}>
        {warnings.map((warning) => (
          <Text key={warning} style={styles.message}>
            {warningMessage(warning)}
          </Text>
        ))}
        {onEdit && (
          <Pressable onPress={onEdit} accessibilityRole="button">
            <Text style={styles.editLink}>Open full editor to fix →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerCritical: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  bannerInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  body: { flex: 1, gap: 6 },
  message: { fontSize: 13, color: SmartCartColors.text, lineHeight: 18 },
  editLink: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primary, marginTop: 4 },
});

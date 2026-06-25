import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { isLocationIncomplete } from '@/src/utils/storeLocationUtils';
import type { StoreLocation } from '@/src/models/types';

type Props = {
  location: StoreLocation;
  onPress?: () => void;
  onDetect?: () => void;
  detecting?: boolean;
  detectError?: string | null;
};

export function LocationBackfillBanner({
  location,
  onPress,
  onDetect,
  detecting = false,
  detectError,
}: Props) {
  if (!isLocationIncomplete(location)) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Add store state/province</Text>
      <Text style={styles.body}>
        Regional price tracking and inflation work best with a state or province code (e.g. TX, ON).
      </Text>
      {detectError ? <Text style={styles.errorText}>{detectError}</Text> : null}
      <View style={styles.actions}>
        {onDetect ? (
          <Pressable
            style={[styles.actionBtn, styles.detectBtn]}
            onPress={onDetect}
            disabled={detecting}
            accessibilityRole="button">
            {detecting ? (
              <ActivityIndicator size="small" color={SmartCartColors.primaryDark} />
            ) : (
              <Text style={styles.detectBtnText}>Detect from address</Text>
            )}
          </Pressable>
        ) : null}
        {onPress ? (
          <Pressable style={styles.actionBtn} onPress={onPress} accessibilityRole="button">
            <Text style={styles.editBtnText}>Edit manually</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: SmartCartColors.primaryMuted,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, marginBottom: 4 },
  body: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18 },
  errorText: { fontSize: 12, color: SmartCartColors.accentOrange, marginTop: 8, lineHeight: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  detectBtn: { minWidth: 148, alignItems: 'center' },
  detectBtnText: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primaryDark },
  editBtnText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
});

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useScanElapsedTime } from '@/src/hooks/useScanElapsedTime';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import {
  DEEPREAD_SCAN_ESTIMATE_TYPICAL_MAX_SEC,
  getDeepReadScanWaitMessages,
  type ReceiptScanStage,
} from '@/src/utils/scanWaitTime';

type ReceiptScanProcessingProps = {
  active?: boolean;
  stage?: ReceiptScanStage;
  /** Dark camera overlay (native scan) vs light app background (web upload). */
  variant?: 'dark' | 'light';
  header?: ReactNode;
  style?: ViewStyle;
  /** Shown once scan exceeds typical wait — queue in background and leave screen. */
  onBackgroundPress?: () => void;
  backgroundLabel?: string;
};

export function ReceiptScanProcessing({
  active = true,
  stage = 'reading',
  variant = 'light',
  header,
  style,
  onBackgroundPress,
  backgroundLabel,
}: ReceiptScanProcessingProps) {
  const elapsedSec = useScanElapsedTime(active);
  const { label, hint } = getDeepReadScanWaitMessages(elapsedSec, stage);
  const isDark = variant === 'dark';
  const showBackground =
    Boolean(onBackgroundPress) && elapsedSec >= DEEPREAD_SCAN_ESTIMATE_TYPICAL_MAX_SEC;

  return (
    <View style={[styles.container, isDark && styles.containerDark, style]}>
      {header}
      <View style={styles.center}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : SmartCartColors.primary} />
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
        <Text style={[styles.hint, isDark && styles.hintDark]}>{hint}</Text>
        {showBackground ? (
          <Pressable
            style={[styles.backgroundBtn, isDark && styles.backgroundBtnDark]}
            onPress={onBackgroundPress}>
            <Text style={[styles.backgroundBtnText, isDark && styles.backgroundBtnTextDark]}>
              {backgroundLabel ?? 'Continue in background'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SmartCartColors.background,
  },
  containerDark: {
    backgroundColor: '#111',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  label: {
    marginTop: 16,
    color: SmartCartColors.text,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  labelDark: {
    color: '#fff',
  },
  hint: {
    marginTop: 8,
    color: SmartCartColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  hintDark: {
    color: 'rgba(255,255,255,0.65)',
  },
  backgroundBtn: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
  },
  backgroundBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  backgroundBtnText: {
    color: SmartCartColors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  backgroundBtnTextDark: {
    color: '#fff',
  },
});

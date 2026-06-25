import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

const DEFAULT_MAX_SHEET_HEIGHT_RATIO = 0.85;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;
const WEB_MODAL_Z_INDEX = 1200;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Sticky action row rendered below the scroll area (e.g. Cancel / Save). */
  footer?: ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
  /** Fraction of window height (0–1). Defaults to 0.85. */
  maxHeightRatio?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
};

export function AppBottomSheetModal({
  visible,
  onClose,
  children,
  footer,
  cardStyle,
  maxHeightRatio = DEFAULT_MAX_SHEET_HEIGHT_RATIO,
  contentContainerStyle,
  footerStyle,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = windowHeight * maxHeightRatio;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View
            style={[styles.card, { maxHeight: maxSheetHeight }, cardStyle]}
            onStartShouldSetResponder={() => true}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              bounces={false}
              contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
              {children}
            </ScrollView>
            {footer ? <View style={[styles.footer, footerStyle]}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as const,
          top: 0,
          right: 0,
          left: 0,
          bottom: TAB_BAR_HEIGHT,
          zIndex: WEB_MODAL_Z_INDEX,
        }
      : null),
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    ...(Platform.OS === 'web' ? { zIndex: 0 } : null),
  },
  card: {
    backgroundColor: SmartCartColors.card,
    borderTopLeftRadius: SmartCartRadius.lg,
    borderTopRightRadius: SmartCartRadius.lg,
    zIndex: 1,
    elevation: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { position: 'relative' as const } : null),
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: SmartCartColors.card,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
});

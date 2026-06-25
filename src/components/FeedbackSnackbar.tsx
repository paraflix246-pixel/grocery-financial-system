import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  message: string | null;
};

/** Brief success/info bar — same visual language as UndoSnackbar, without actions. */
export function FeedbackSnackbar({ message }: Props) {
  if (!message) return null;

  return (
    <View style={styles.bar} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.label} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: SmartCartColors.text,
    borderRadius: SmartCartRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

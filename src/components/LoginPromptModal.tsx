import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import type { LoginPromptReason } from '@/src/services/authRoutingService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  visible: boolean;
  reason: LoginPromptReason;
  onDismiss?: () => void;
  returnTo?: string;
};

function messageForReason(reason: LoginPromptReason): string {
  if (reason === 'idle_timeout') {
    return 'Your session timed out after a period of inactivity. Sign in again to continue.';
  }
  return 'Your session has expired. Sign in again to access your account.';
}

export function LoginPromptModal({
  visible,
  reason,
  onDismiss,
  returnTo = '/(tabs)',
}: Props) {
  const router = useRouter();

  function handleSignIn() {
    onDismiss?.();
    const encodedReturn = encodeURIComponent(returnTo);
    router.replace(`/onboarding/signin?returnTo=${encodedReturn}` as Href);
  }

  return (
    <AppBottomSheetModal visible={visible} onClose={onDismiss ?? (() => {})}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.message}>{messageForReason(reason)}</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={handleSignIn}
          accessibilityRole="button"
          accessibilityLabel="Sign in">
          <Text style={styles.primaryBtnText}>Sign in</Text>
        </Pressable>
      </View>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: SmartCartColors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

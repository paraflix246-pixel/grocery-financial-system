import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import {
  deleteAccount,
  isDeleteConfirmationValid,
  isGuestOrUnsigned,
} from '@/src/services/accountDeleteService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function DeleteAccountSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccountState = useCallback(async () => {
    setIsGuest(await isGuestOrUnsigned());
  }, []);

  useEffect(() => {
    if (visible) {
      setConfirmText('');
      setError(null);
      void loadAccountState();
    }
  }, [visible, loadAccountState]);

  const canConfirm = isDeleteConfirmationValid(confirmText) && !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      onClose();
      router.replace('/onboarding' as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <View style={styles.footer}>
      <Pressable
        style={styles.cancelBtn}
        onPress={onClose}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      <Pressable
        style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!canConfirm}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.confirmText}>Delete account</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose} footer={footer}>
      <Text style={styles.title}>Delete account?</Text>
      {isGuest === null ? (
        <ActivityIndicator color={SmartCartColors.primary} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.body}>
            {isGuest
              ? 'This permanently and irreversibly deletes all receipts, lists, pantry items, preferences, and trial data stored on this device. Guest data is not synced to the cloud and cannot be recovered.'
              : 'This permanently and irreversibly deletes your cloud account, subscription records, and all data on this device — including receipts, lists, pantry items, and preferences. This cannot be undone.'}
          </Text>
          <Text style={styles.body}>
            Type DELETE below to confirm.
          </Text>
          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE"
            placeholderTextColor={SmartCartColors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            accessibilityLabel="Type DELETE to confirm"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text, marginBottom: 12 },
  body: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 21, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    fontSize: 16,
    backgroundColor: SmartCartColors.background,
    color: SmartCartColors.text,
    marginTop: 4,
  },
  error: { fontSize: 13, color: SmartCartColors.danger, marginTop: 10, lineHeight: 18 },
  loader: { marginVertical: 24 },
  footer: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.danger,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

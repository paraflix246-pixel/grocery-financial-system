import { Alert, Platform } from 'react-native';

type ConfirmDestructiveOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function confirmDestructiveAction({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
}: ConfirmDestructiveOptions): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      void Promise.resolve(onConfirm());
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: () => void Promise.resolve(onConfirm()),
    },
  ]);
}

/** Alias for confirmDestructiveAction — use for all permanent delete flows. */
export const confirmDelete = confirmDestructiveAction;

import { Alert, Platform } from 'react-native';

/** Cross-platform info alert. RN Web's Alert.alert is a no-op. */
export function showInfoAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}

export type PlatformAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/** Cross-platform multi-choice alert. On web, returns false so callers can show a modal instead. */
export function showChoiceAlert(
  title: string,
  message: string | undefined,
  buttons: PlatformAlertButton[]
): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  Alert.alert(title, message, buttons);
  return true;
}

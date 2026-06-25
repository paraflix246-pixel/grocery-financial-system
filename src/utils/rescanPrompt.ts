import { Alert, Platform } from 'react-native';

export function rescanPromptMessage(unscannedCount: number): string {
  if (unscannedCount === 1) {
    return "1 item couldn't be read clearly. Rescan with a clearer photo? Hold the receipt flat and keep your fingers off the text.";
  }
  return `${unscannedCount} items couldn't be read clearly. Rescan with a clearer photo? Hold the receipt flat and keep your fingers off the text.`;
}

/** Ask whether to return to the scan tab for a clearer photo. */
export async function confirmRescanPrompt(unscannedCount: number): Promise<boolean> {
  const title = 'Rescan for better results?';
  const message = rescanPromptMessage(unscannedCount);

  if (Platform.OS === 'web') {
    return window.confirm(`${title}\n\n${message}`);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes, rescan', onPress: () => resolve(true) },
    ]);
  });
}

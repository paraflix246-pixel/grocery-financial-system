import { Alert, Platform } from 'react-native';

type PromptUpgradeOptions = {
  featureName: string;
  onUpgrade: () => void;
};

export function promptUpgrade({ featureName, onUpgrade }: PromptUpgradeOptions): void {
  const title = 'Upgrade to SmartCart Pro';
  const message = `${featureName} is a Pro feature. Upgrade to unlock advanced insights, community pricing, and more.`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onUpgrade();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'View plans', onPress: onUpgrade },
  ]);
}

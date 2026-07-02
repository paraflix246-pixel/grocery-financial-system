import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OnboardingColors } from '@/src/theme/onboardingTheme';

const MESSAGE_KEYS = [
  'onboarding.flow.analyzing.msg1',
  'onboarding.flow.analyzing.msg2',
  'onboarding.flow.analyzing.msg3',
] as const;

const MAX_DURATION_MS = 3000;
const MESSAGE_INTERVAL_MS = 900;

type Props = {
  onComplete: () => void;
};

export function AnalyzingStep({ onComplete }: Props) {
  const { t } = useTranslation();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % MESSAGE_KEYS.length);
    }, MESSAGE_INTERVAL_MS);

    const completeTimer = setTimeout(onComplete, MAX_DURATION_MS);

    return () => {
      clearInterval(messageTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={OnboardingColors.green} />
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.flow.analyzing.title')}
      </Text>
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {t(MESSAGE_KEYS[messageIndex])}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 48,
  },
  title: {
    color: OnboardingColors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
    minHeight: 46,
    maxWidth: 300,
  },
});

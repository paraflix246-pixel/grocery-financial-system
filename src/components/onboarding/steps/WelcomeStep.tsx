import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import {
  OnboardingColors,
  OnboardingPrimaryCta,
  OnboardingPrimaryCtaText,
} from '@/src/theme/onboardingTheme';

type Props = {
  onGetStarted: () => void;
  onSignIn: () => void;
  onLogoPress?: () => void;
  logoAccessibilityLabel?: string;
};

export function WelcomeStep({
  onGetStarted,
  onSignIn,
  onLogoPress,
  logoAccessibilityLabel,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <PennyPantryLogo
          variant="hero"
          size={64}
          style={styles.logo}
          onPress={onLogoPress}
          accessibilityLabel={logoAccessibilityLabel}
        />
        <Text style={styles.title} accessibilityRole="header">
          {t('onboarding.flow.welcome.title')}
        </Text>
        <Text style={styles.subtitle}>{t('onboarding.flow.welcome.subtitle')}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [OnboardingPrimaryCta, pressed && styles.pressed]}
          onPress={onGetStarted}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.flow.welcome.getStarted')}
        >
          <Text style={OnboardingPrimaryCtaText}>{t('onboarding.flow.welcome.getStarted')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel={t('common.signIn')}
        >
          <Text style={styles.signInText}>{t('common.signIn')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 24 },
  logo: { marginBottom: 24 },
  title: {
    color: OnboardingColors.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 12,
    maxWidth: 340,
  },
  subtitle: {
    color: OnboardingColors.textMuted,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 25,
    maxWidth: 320,
  },
  actions: { gap: 12 },
  signInBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
    minHeight: 52,
  },
  signInText: {
    color: OnboardingColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: { opacity: 0.88 },
});

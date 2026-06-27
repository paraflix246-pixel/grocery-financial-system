import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { OnboardingColors } from '@/src/theme/onboardingTheme';

const SHOW_APPLE = Platform.OS === 'ios' || Platform.OS === 'web';

type OnboardingSignupSlideProps = {
  loading: boolean;
  error: string | null;
  onEmailSignup: () => void;
  onGoogle: () => void;
  onApple: () => void;
  onSignIn: () => void;
};

export function OnboardingSignupSlide({
  loading,
  error,
  onEmailSignup,
  onGoogle,
  onApple,
  onSignIn,
}: OnboardingSignupSlideProps) {
  const { t } = useTranslation();

  const benefits = [
    t('onboarding.signup.benefit1'),
    t('onboarding.signup.benefit2'),
    t('onboarding.signup.benefit3'),
  ] as const;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <PennyPantryLogo variant="hero" size={72} style={styles.logo} />
          <Text style={styles.headline}>
            {t('onboarding.signup.headline')}
            {'\n'}
            <Text style={styles.headlineAccent}>{t('onboarding.signup.headlineAccent')}</Text>
          </Text>
          <Text style={styles.subheadline}>{t('onboarding.signup.subheadline')}</Text>
        </View>

        <View style={styles.benefits}>
          {benefits.map((label) => (
            <View key={label} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>✓</Text>
              </View>
              <Text style={styles.benefitLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
            onPress={onEmailSignup}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.signup.emailSignup')}
          >
            <Text style={styles.primaryBtnText}>{t('onboarding.signup.emailSignup')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.outlineBtn,
              loading && styles.btnDisabled,
              pressed && styles.outlineBtnPressed,
            ]}
            onPress={onGoogle}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.signup.google')}
          >
            {loading ? (
              <ActivityIndicator color={OnboardingColors.text} />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.outlineBtnText}>{t('onboarding.signup.google')}</Text>
              </>
            )}
          </Pressable>

          {SHOW_APPLE ? (
            <Pressable
              style={({ pressed }) => [
                styles.outlineBtn,
                loading && styles.btnDisabled,
                pressed && styles.outlineBtnPressed,
              ]}
              onPress={onApple}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.signup.apple')}
            >
              <Text style={styles.appleGlyph}>{'\uF8FF'}</Text>
              <Text style={styles.outlineBtnText}>{t('onboarding.signup.apple')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onSignIn}
            style={styles.loginLinkBtn}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.signup.login')}
          >
            <Text style={styles.loginLinkText}>
              {t('onboarding.signup.hasAccount')}{' '}
              <Text style={styles.loginLinkHighlight}>{t('onboarding.signup.login')}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
  },
  logo: {
    marginBottom: 24,
    alignSelf: 'center',
  },
  headline: {
    color: OnboardingColors.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: 14,
  },
  headlineAccent: {
    color: OnboardingColors.green,
  },
  subheadline: {
    color: OnboardingColors.textMuted,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 340,
    alignSelf: 'center',
  },
  benefits: {
    width: '100%',
    maxWidth: 340,
    gap: 14,
    marginBottom: 32,
    alignSelf: 'center',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitIconText: {
    fontSize: 18,
    color: OnboardingColors.green,
    fontWeight: '700',
  },
  benefitLabel: {
    flex: 1,
    color: OnboardingColors.text,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 17,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  outlineBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: OnboardingColors.card,
    borderRadius: 999,
    paddingVertical: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
  },
  outlineBtnPressed: {
    backgroundColor: '#F9FAFB',
  },
  outlineBtnText: {
    color: OnboardingColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  googleG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
  },
  appleGlyph: {
    fontSize: 20,
    color: OnboardingColors.text,
    marginTop: -2,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnPressed: {
    opacity: 0.88,
  },
  loginLinkBtn: {
    width: '100%',
    paddingVertical: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  loginLinkText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  loginLinkHighlight: {
    color: OnboardingColors.green,
    fontWeight: '600',
  },
});

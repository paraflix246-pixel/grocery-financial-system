import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { forgotPassword, signInWithGoogle } from '@/src/services/authService';
import { OnboardingColors } from '@/src/theme/onboardingTheme';
import { navigateToOnboardingWelcome } from '@/src/utils/onboardingWelcomeNavigation';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<'sent' | 'oauth_only' | 'generic_success' | null>(
    null
  );
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);

  function providerLabel(provider: string): string {
    if (provider === 'google') return t('auth.forgotPassword.providerGoogle');
    if (provider === 'apple') return t('auth.forgotPassword.providerApple');
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  async function handleSend() {
    setError(null);
    if (!isValidEmail(email)) {
      setError(t('auth.forgotPassword.errorEmail'));
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setResultStatus(result.status);
      setOauthProvider(result.provider ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.forgotPassword.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  function handleBackToSignIn() {
    router.back();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.forgotPassword.errorGeneric'));
      setLoading(false);
    }
  }

  function handleCreateAccount() {
    router.push('/onboarding/signup');
  }

  function handleLogoHome() {
    void navigateToOnboardingWelcome(router);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={OnboardingColors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PennyPantryLogo
          variant="hero"
          size={56}
          style={styles.logo}
          onPress={handleLogoHome}
          accessibilityLabel={t('onboarding.flow.logoHomeA11y')}
        />

        <Text style={styles.heading}>{t('auth.forgotPassword.heading')}</Text>
        <Text style={styles.subheading}>{t('auth.forgotPassword.subheading')}</Text>

        {resultStatus === 'oauth_only' && oauthProvider ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>🔐</Text>
            <Text style={styles.infoTitle}>
              {t('auth.forgotPassword.oauthOnlyTitle', {
                provider: providerLabel(oauthProvider),
              })}
            </Text>
            <Text style={styles.infoText}>
              {t('auth.forgotPassword.oauthOnlyBody', {
                provider: providerLabel(oauthProvider),
              })}
            </Text>
            {oauthProvider === 'google' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.googleBtn,
                  loading && styles.ctaBtnDisabled,
                  pressed && styles.googleBtnPressed,
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.signin.google')}
              >
                {loading ? (
                  <ActivityIndicator color={OnboardingColors.text} />
                ) : (
                  <>
                    <Text style={styles.googleBtnG}>G</Text>
                    <Text style={styles.googleBtnText}>{t('auth.signin.google')}</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : resultStatus ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>
              {resultStatus === 'sent'
                ? t('auth.forgotPassword.successTitle')
                : t('auth.forgotPassword.successTitleGeneric')}
            </Text>
            <Text style={styles.successText}>
              {resultStatus === 'sent'
                ? t('auth.forgotPassword.successBodySent', { email: email.trim() })
                : t('auth.forgotPassword.successBodyGeneric', { email: email.trim() })}
            </Text>
            <Text style={styles.successHints}>{t('auth.forgotPassword.successHints')}</Text>
            <Pressable
              onPress={handleCreateAccount}
              style={styles.inlineLink}
              accessibilityRole="button"
            >
              <Text style={styles.inlineLinkText}>
                {t('auth.forgotPassword.noAccountYet')}{' '}
                <Text style={styles.inlineLinkHighlight}>{t('auth.forgotPassword.createAccount')}</Text>
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.forgotPassword.email')}</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                placeholderTextColor={OnboardingColors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                selectionColor={OnboardingColors.green}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                (loading || !email.trim()) && styles.ctaBtnDisabled,
                pressed && styles.ctaBtnPressed,
              ]}
              onPress={handleSend}
              disabled={loading || !email.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('auth.forgotPassword.submit')}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaBtnText}>{t('auth.forgotPassword.submit')}</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable
          onPress={handleBackToSignIn}
          style={styles.backLink}
          accessibilityRole="button"
        >
          <Text style={styles.backLinkText}>
            ← <Text style={styles.backLinkHighlight}>{t('auth.forgotPassword.backToSignIn')}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logo: {
    marginBottom: 8,
  },
  heading: {
    color: OnboardingColors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  successTitle: {
    color: OnboardingColors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  successText: {
    color: OnboardingColors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  successHints: {
    color: OnboardingColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 14,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  infoTitle: {
    color: OnboardingColors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    color: OnboardingColors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    color: OnboardingColors.green,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    color: OnboardingColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: OnboardingColors.card,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: OnboardingColors.text,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: OnboardingColors.green,
  },
  ctaBtn: {
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaBtnPressed: {
    opacity: 0.88,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
  },
  backLinkText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
  },
  backLinkHighlight: {
    color: OnboardingColors.green,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingColors.card,
    borderRadius: 999,
    paddingVertical: 15,
    gap: 10,
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  googleBtnPressed: {
    backgroundColor: '#F9FAFB',
  },
  googleBtnG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: OnboardingColors.text,
  },
  inlineLink: {
    marginTop: 16,
    paddingVertical: 4,
  },
  inlineLinkText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  inlineLinkHighlight: {
    color: OnboardingColors.green,
    fontWeight: '600',
  },
});

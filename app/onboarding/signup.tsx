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
import { signUpWithEmail, continueAsGuest, signInWithGoogle } from '@/src/services/authService';
import { completeOAuthAndRoute } from '@/src/services/onboardingOAuthRouting';
import { setOAuthIntent } from '@/src/services/onboardingFlowState';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import {
  OnboardingColors,
  OnboardingPrimaryCta,
  OnboardingPrimaryCtaText,
} from '@/src/theme/onboardingTheme';
import { navigateToOnboardingWelcome } from '@/src/utils/onboardingWelcomeNavigation';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  async function handleSignUp() {
    setError(null);
    if (!isValidEmail(email)) {
      setError(t('auth.signup.errorEmail'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.signup.errorPassword'));
      return;
    }
    setLoading(true);
    try {
      const result = await signUpWithEmail(email, password, name);
      if (result.needsEmailVerification) {
        setSubmittedEmail(email.trim());
        setAwaitingVerification(true);
        return;
      }
      router.push('/onboarding/upgrade');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.signup.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    try {
      await continueAsGuest();
      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await setOAuthIntent('signup');
      await signInWithGoogle();
      if (Platform.OS !== 'web') {
        await completeOAuthAndRoute(router, completeOnboarding);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSignIn() {
    router.push('/onboarding/signin');
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

        {/* Heading */}
        <Text style={styles.heading}>{t('auth.signup.heading')}</Text>
        <Text style={styles.subheading}>{t('auth.signup.subheading')}</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {awaitingVerification ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>{t('auth.signup.verifyTitle')}</Text>
            <Text style={styles.successText}>
              {t('auth.signup.verifyBody', { email: submittedEmail })}
            </Text>
            <Text style={styles.successHints}>{t('auth.signup.verifyHints')}</Text>
            <Pressable
              onPress={handleSignIn}
              style={styles.signinLink}
              accessibilityRole="button"
            >
              <Text style={styles.signinLinkText}>
                {t('auth.signup.verifyBackToSignIn')}{' '}
                <Text style={styles.signinHighlight}>{t('auth.signup.signIn')}</Text>
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
        {/* Name input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.signup.name')}</Text>
          <TextInput
            style={[
              styles.input,
              nameFocused && styles.inputFocused,
            ]}
            placeholder={t('auth.signup.namePlaceholder')}
            placeholderTextColor={OnboardingColors.textLight}
            autoCapitalize="words"
            autoComplete="name-given"
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            selectionColor={OnboardingColors.green}
          />
        </View>

        {/* Email input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.signup.email')}</Text>
          <TextInput
            style={[
              styles.input,
              emailFocused && styles.inputFocused,
            ]}
            placeholder={t('auth.signup.emailPlaceholder')}
            placeholderTextColor={OnboardingColors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            selectionColor={OnboardingColors.green}
          />
        </View>

        {/* Password input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.signup.password')}</Text>
          <TextInput
            style={[
              styles.input,
              passwordFocused && styles.inputFocused,
            ]}
            placeholder={t('auth.signup.passwordPlaceholder')}
            placeholderTextColor={OnboardingColors.textLight}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onSubmitEditing={handleSignUp}
            returnKeyType="done"
            selectionColor={OnboardingColors.green}
          />
        </View>

        {/* Continue button */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            (loading || !email || !password) && styles.ctaBtnDisabled,
            pressed && styles.ctaBtnPressed,
          ]}
          onPress={handleSignUp}
          disabled={loading || !email || !password}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signup.submit')}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>{t('auth.signup.submit')}</Text>
          )}
        </Pressable>

        {/* Google sign-up */}
        <Pressable
          style={({ pressed }) => [
            styles.googleBtn,
            loading && styles.ctaBtnDisabled,
            pressed && styles.googleBtnPressed,
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signup.google')}
        >
          <Text style={styles.googleBtnG}>G</Text>
          <Text style={styles.googleBtnText}>{t('auth.signup.google')}</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Guest button */}
        <Pressable
          style={({ pressed }) => [
            styles.ghostBtn,
            loading && styles.ctaBtnDisabled,
            pressed && styles.ghostBtnPressed,
          ]}
          onPress={handleGuest}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signup.guest')}
        >
          <Text style={styles.ghostBtnText}>{t('auth.signup.guest')}</Text>
        </Pressable>

        {/* Terms */}
        <Text style={styles.terms}>
          {t('auth.signup.termsPrefix')}{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
            {t('auth.signup.terms')}
          </Text>{' '}
          {t('auth.signup.and')}{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>
            {t('auth.signup.privacy')}
          </Text>
        </Text>

        {/* Sign in link */}
        <Pressable
          onPress={handleSignIn}
          style={styles.signinLink}
          accessibilityRole="button"
        >
          <Text style={styles.signinLinkText}>
            {t('auth.signup.hasAccount')}{' '}
            <Text style={styles.signinHighlight}>{t('auth.signup.signIn')}</Text>
          </Text>
        </Pressable>
          </>
        )}
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
    textAlign: 'center',
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
  inputGroup: {
    marginBottom: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...OnboardingPrimaryCta,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaBtnPressed: {
    opacity: 0.88,
  },
  ctaBtnText: {
    ...OnboardingPrimaryCtaText,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: OnboardingColors.border,
  },
  dividerText: {
    color: OnboardingColors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingColors.card,
  },
  ghostBtnPressed: {
    backgroundColor: '#F9FAFB',
  },
  ghostBtnText: {
    color: OnboardingColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    color: OnboardingColors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: OnboardingColors.green,
    textDecorationLine: 'underline',
  },
  signinLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  signinLinkText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
  },
  signinHighlight: {
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
    marginTop: 8,
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
});

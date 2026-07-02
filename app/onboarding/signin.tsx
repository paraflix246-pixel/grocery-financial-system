import React, { useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { signInWithEmail, continueAsGuest, signInWithGoogle, checkSignInHint } from '@/src/services/authService';
import { isAdminUser, syncUserProfile } from '@/src/services/admin/adminApiService';
import {
  getRememberMePreference,
  recordActivityTimestamp,
  setRememberMePreference,
} from '@/src/services/authRoutingService';
import { completeOAuthAndRoute } from '@/src/services/onboardingOAuthRouting';
import { setOAuthIntent, setOAuthReturnTo } from '@/src/services/onboardingFlowState';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import {
  OnboardingColors,
  OnboardingPrimaryCta,
  OnboardingPrimaryCtaText,
} from '@/src/theme/onboardingTheme';
import { navigateToOnboardingWelcome } from '@/src/utils/onboardingWelcomeNavigation';

export default function SigninScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthHintProvider, setOauthHintProvider] = useState<string | null>(null);
  const [showSignUpHint, setShowSignUpHint] = useState(false);

  function providerLabel(provider: string): string {
    if (provider === 'google') return t('auth.signin.google');
    if (provider === 'apple') return t('auth.signin.apple', { defaultValue: 'Apple' });
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  useEffect(() => {
    void getRememberMePreference().then(setRememberMe);
  }, []);

  function resolveReturnPath(): Href {
    if (typeof returnTo === 'string' && returnTo.trim()) {
      return decodeURIComponent(returnTo) as Href;
    }
    return '/(tabs)' as Href;
  }

  async function handleSignIn() {
    setError(null);
    setOauthHintProvider(null);
    setShowSignUpHint(false);
    if (!email.trim()) {
      setError(t('auth.signin.errorEmail'));
      return;
    }
    if (!password) {
      setError(t('auth.signin.errorPassword'));
      return;
    }
    setLoading(true);
    try {
      await setRememberMePreference(rememberMe);
      await signInWithEmail(email, password);
      await recordActivityTimestamp();
      await syncUserProfile();
      if (returnTo) {
        await completeOnboarding();
        router.replace(resolveReturnPath());
      } else if (isAdminUser()) {
        await completeOnboarding();
        router.replace('/(tabs)' as Href);
      } else {
        router.push('/onboarding/upgrade');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.signin.errorGeneric');
      const isCredentialError =
        message.toLowerCase().includes('incorrect email or password') ||
        message.toLowerCase().includes('invalid login credentials');

      if (isCredentialError && isValidEmail(email)) {
        const hint = await checkSignInHint(email);
        if (hint.hint === 'oauth_only' && hint.provider) {
          setOauthHintProvider(hint.provider);
          setError(
            t('auth.signin.oauthOnlyHint', { provider: providerLabel(hint.provider) })
          );
        } else if (hint.hint === 'unknown') {
          setShowSignUpHint(true);
          setError(t('auth.signin.errorInvalidOrNew'));
        } else {
          setError(message);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    try {
      await continueAsGuest();
      await completeOnboarding();
      await recordActivityTimestamp();
      router.replace(returnTo ? resolveReturnPath() : ('/(tabs)' as Href));
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setOauthHintProvider(null);
    setShowSignUpHint(false);
    setLoading(true);
    try {
      await setOAuthIntent('signin');
      if (typeof returnTo === 'string' && returnTo.trim()) {
        await setOAuthReturnTo(returnTo);
      }
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

  function handleForgotPassword() {
    router.push('/onboarding/forgot-password');
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

        {/* Heading */}
        <Text style={styles.heading}>{t('auth.signin.heading')}</Text>
        <Text style={styles.subheading}>{t('auth.signin.subheading')}</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {oauthHintProvider ? (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{t('auth.signin.oauthOnlyAction')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.googleBtnSuggested,
                loading && styles.ctaBtnDisabled,
                pressed && styles.googleBtnPressed,
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signin.google')}
            >
              <Text style={styles.googleBtnG}>G</Text>
              <Text style={styles.googleBtnText}>{t('auth.signin.google')}</Text>
            </Pressable>
          </View>
        ) : null}

        {showSignUpHint ? (
          <Pressable
            onPress={handleCreateAccount}
            style={styles.signUpHintLink}
            accessibilityRole="button"
          >
            <Text style={styles.signUpHintText}>
              {t('auth.signin.noAccountYet')}{' '}
              <Text style={styles.createHighlight}>{t('auth.signin.createAccount')}</Text>
            </Text>
          </Pressable>
        ) : null}

        {/* Email input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.signin.email')}</Text>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder={t('auth.signin.emailPlaceholder')}
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
          <Text style={styles.label}>{t('auth.signin.password')}</Text>
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder={t('auth.signin.passwordPlaceholder')}
            placeholderTextColor={OnboardingColors.textLight}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onSubmitEditing={handleSignIn}
            returnKeyType="done"
            selectionColor={OnboardingColors.green}
          />
        </View>

        {/* Forgot password */}
        <Pressable style={styles.forgotLink} onPress={handleForgotPassword} accessibilityRole="button">
          <Text style={styles.forgotText}>{t('auth.signin.forgotPassword')}</Text>
        </Pressable>

        {/* Remember me */}
        <Pressable
          style={styles.rememberRow}
          onPress={() => setRememberMe((current) => !current)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
          accessibilityLabel={t('auth.signin.rememberMe')}>
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.rememberLabel}>{t('auth.signin.rememberMe')}</Text>
        </Pressable>

        {/* Sign in button */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            (loading || !email || !password) && styles.ctaBtnDisabled,
            pressed && styles.ctaBtnPressed,
          ]}
          onPress={handleSignIn}
          disabled={loading || !email || !password}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signin.submit')}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>{t('auth.signin.submit')}</Text>
          )}
        </Pressable>

        {/* Google sign-in */}
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
          <Text style={styles.googleBtnG}>G</Text>
          <Text style={styles.googleBtnText}>{t('auth.signin.google')}</Text>
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
          accessibilityLabel={t('auth.signin.guest')}
        >
          <Text style={styles.ghostBtnText}>{t('auth.signin.guest')}</Text>
        </Pressable>

        {/* Create account CTA for new users */}
        <Text style={styles.newHereLabel}>{t('auth.signin.newHere')}</Text>
        <Pressable
          onPress={handleCreateAccount}
          style={({ pressed }) => [styles.createAccountBtn, pressed && styles.createAccountBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signin.createAccount')}
        >
          <Text style={styles.createAccountBtnText}>{t('auth.signin.createAccount')}</Text>
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotText: {
    color: OnboardingColors.green,
    fontSize: 14,
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: OnboardingColors.green,
    borderColor: OnboardingColors.green,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  rememberLabel: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
    fontWeight: '500',
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
  newHereLabel: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  createAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    ...OnboardingPrimaryCta,
  },
  createAccountBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  createAccountBtnText: {
    ...OnboardingPrimaryCtaText,
  },
  createHighlight: {
    color: OnboardingColors.greenDark,
    fontWeight: '700',
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
  googleBtnSuggested: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 15,
    gap: 10,
    borderWidth: 2,
    borderColor: '#4285F4',
    marginTop: 4,
  },
  hintBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    gap: 12,
  },
  hintText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  signUpHintLink: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  signUpHintText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});

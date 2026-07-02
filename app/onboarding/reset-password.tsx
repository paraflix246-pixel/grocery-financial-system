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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { getSession, resetPassword, notifyPasswordChanged } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import { getOnboardingBottomPadding, OnboardingColors } from '@/src/theme/onboardingTheme';
import { navigateToOnboardingWelcome } from '@/src/utils/onboardingWelcomeNavigation';

export default function OnboardingResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function verifyRecoverySession() {
      if (!supabase) {
        if (!cancelled) {
          setError('Password reset is not available. Please try again later.');
          setCheckingSession(false);
        }
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session) {
          setHasRecoverySession(true);
          setCheckingSession(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      const session = await getSession();
      if (!cancelled) {
        setHasRecoverySession(Boolean(session));
        setCheckingSession(false);
      }
    }

    void verifyRecoverySession();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  async function handleReset() {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(password);
      void notifyPasswordChanged();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSignIn() {
    router.replace('/onboarding/signin');
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
          { paddingTop: insets.top + 16, paddingBottom: getOnboardingBottomPadding(insets.bottom) },
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

        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.subheading}>Choose a new password for your account.</Text>

        {checkingSession ? (
          <ActivityIndicator color={OnboardingColors.green} style={styles.loader} />
        ) : success ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successText}>
              Your password has been changed. You can now sign in with your new password.
            </Text>
            <Pressable style={styles.ctaBtn} onPress={handleSignIn} accessibilityRole="button">
              <Text style={styles.ctaBtnText}>Go to sign in</Text>
            </Pressable>
          </View>
        ) : !hasRecoverySession ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              This reset link is invalid or has expired. Request a new link from the sign-in screen.
            </Text>
            <Pressable style={styles.ghostBtn} onPress={handleSignIn} accessibilityRole="button">
              <Text style={styles.ghostBtnText}>Back to sign in</Text>
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
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={[styles.input, passwordFocused && styles.inputFocused]}
                placeholder="At least 6 characters"
                placeholderTextColor={OnboardingColors.textLight}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                selectionColor={OnboardingColors.green}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={[styles.input, confirmFocused && styles.inputFocused]}
                placeholder="Re-enter your password"
                placeholderTextColor={OnboardingColors.textLight}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                onSubmitEditing={handleReset}
                returnKeyType="done"
                selectionColor={OnboardingColors.green}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                (loading || !password || !confirmPassword) && styles.ctaBtnDisabled,
                pressed && styles.ctaBtnPressed,
              ]}
              onPress={handleReset}
              disabled={loading || !password || !confirmPassword}
              accessibilityRole="button"
              accessibilityLabel="Update password"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaBtnText}>Update password</Text>
              )}
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
  loader: {
    marginTop: 24,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    gap: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    gap: 12,
  },
  successIcon: {
    fontSize: 36,
    color: OnboardingColors.green,
    fontWeight: '700',
  },
  successTitle: {
    color: OnboardingColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  successText: {
    color: OnboardingColors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
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
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
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
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingColors.card,
  },
  ghostBtnText: {
    color: OnboardingColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { forgotPassword } from '@/src/services/authService';
import { OnboardingColors } from '@/src/theme/onboardingTheme';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleBackToSignIn() {
    router.back();
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
        <PennyPantryLogo variant="hero" size={56} style={styles.logo} />

        <Text style={styles.heading}>Reset your password</Text>
        <Text style={styles.subheading}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successText}>
              We sent a reset link to{' '}
              <Text style={styles.successEmail}>{email.trim()}</Text>. It may take a minute to
              arrive.
            </Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="you@example.com"
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
              accessibilityLabel="Send reset link"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaBtnText}>Send reset link</Text>
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
            ← <Text style={styles.backLinkHighlight}>Back to sign in</Text>
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
});

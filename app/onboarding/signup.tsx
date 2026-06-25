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
import { signUpWithEmail, continueAsGuest, signInWithGoogle } from '@/src/services/authService';
import { useBudgetStore } from '@/src/store/useBudgetStore';

const BG = '#0F0F0F';
const PURPLE = '#7C3AED';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.52)';
const INPUT_BG = '#1A1A1E';
const INPUT_BORDER = 'rgba(255,255,255,0.12)';
const INPUT_BORDER_FOCUS = PURPLE;
const DIVIDER_COLOR = 'rgba(255,255,255,0.12)';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupScreen() {
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

  async function handleSignUp() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      router.push('/onboarding/upgrade');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
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
      await signInWithGoogle();
      // OAuth redirect will handle navigation
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  function handleSignIn() {
    router.push('/onboarding/signin');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PennyPantryLogo />

        {/* Heading */}
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>
          Start saving money on every shop.
        </Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Name input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[
              styles.input,
              nameFocused && styles.inputFocused,
            ]}
            placeholder="Your first name"
            placeholderTextColor="rgba(255,255,255,0.28)"
            autoCapitalize="words"
            autoComplete="name-given"
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            selectionColor={PURPLE}
          />
        </View>

        {/* Email input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[
              styles.input,
              emailFocused && styles.inputFocused,
            ]}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.28)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            selectionColor={PURPLE}
          />
        </View>

        {/* Password input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[
              styles.input,
              passwordFocused && styles.inputFocused,
            ]}
            placeholder="At least 6 characters"
            placeholderTextColor="rgba(255,255,255,0.28)"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onSubmitEditing={handleSignUp}
            returnKeyType="done"
            selectionColor={PURPLE}
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
          accessibilityLabel="Continue"
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaBtnText}>Continue</Text>
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
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.googleBtnG}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
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
          accessibilityLabel="Continue as Guest"
        >
          <Text style={styles.ghostBtnText}>Continue as Guest</Text>
        </Pressable>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
            Terms
          </Text>{' '}
          and{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>
            Privacy Policy
          </Text>
        </Text>

        {/* Sign in link */}
        <Pressable
          onPress={handleSignIn}
          style={styles.signinLink}
          accessibilityRole="button"
        >
          <Text style={styles.signinLinkText}>
            Already have an account?{' '}
            <Text style={styles.signinHighlight}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  heading: {
    color: TEXT_PRIMARY,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    color: TEXT_MUTED,
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
    gap: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: TEXT_PRIMARY,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: INPUT_BORDER_FOCUS,
  },
  ctaBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaBtnPressed: {
    opacity: 0.82,
  },
  ctaBtnText: {
    color: '#000',
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
    backgroundColor: DIVIDER_COLOR,
  },
  dividerText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ghostBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
  signinLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  signinLinkText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  signinHighlight: {
    color: GREEN,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 15,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#4285F4',
    marginTop: 8,
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleBtnG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});

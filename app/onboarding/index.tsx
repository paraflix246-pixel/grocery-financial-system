import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { signInWithApple, signInWithGoogle } from '@/src/services/authService';
import { OnboardingColors } from '@/src/theme/onboardingTheme';

const SHOW_APPLE = Platform.OS === 'ios' || Platform.OS === 'web';

const BENEFITS = [
  { icon: '↘', label: 'Track spending and spot savings' },
  { icon: '⇄', label: 'Compare prices across stores' },
  { icon: '☑', label: 'Build smarter shopping lists' },
] as const;

export default function OnboardingLanding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  function handleEmailSignup() {
    router.push('/onboarding/signup');
  }

  function handleSignIn() {
    router.push('/onboarding/signin');
  }

  async function handleGoogle() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
      setAuthLoading(false);
    }
  }

  async function handleApple() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithApple();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Apple sign-in failed. Please try again.');
      setAuthLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={OnboardingColors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <PennyPantryLogo variant="hero" size={72} style={styles.logo} />
          <Text style={styles.headline}>
            Save money on{'\n'}
            <Text style={styles.headlineAccent}>every shop</Text>
          </Text>
          <Text style={styles.subheadline}>
            Smart grocery budgeting, price comparison, and lists — all in one place.
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((item) => (
            <View key={item.label} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>{item.icon}</Text>
              </View>
              <Text style={styles.benefitLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {authError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              authLoading && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
            onPress={handleEmailSignup}
            disabled={authLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign up with Email"
          >
            <Text style={styles.primaryBtnText}>Sign up with Email</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.outlineBtn,
              authLoading && styles.btnDisabled,
              pressed && styles.outlineBtnPressed,
            ]}
            onPress={handleGoogle}
            disabled={authLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {authLoading ? (
              <ActivityIndicator color={OnboardingColors.text} />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.outlineBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {SHOW_APPLE ? (
            <Pressable
              style={({ pressed }) => [
                styles.outlineBtn,
                authLoading && styles.btnDisabled,
                pressed && styles.outlineBtnPressed,
              ]}
              onPress={handleApple}
              disabled={authLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              <Text style={styles.appleGlyph}>{'\uF8FF'}</Text>
              <Text style={styles.outlineBtnText}>Continue with Apple</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleSignIn}
            style={styles.loginLinkBtn}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 28,
  },
  headline: {
    color: OnboardingColors.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: 16,
  },
  headlineAccent: {
    color: OnboardingColors.green,
  },
  subheadline: {
    color: OnboardingColors.textMuted,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  benefits: {
    gap: 16,
    marginBottom: 40,
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
  },
  errorBox: {
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
    paddingVertical: 16,
    marginTop: 4,
    alignItems: 'center',
  },
  loginLinkText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: OnboardingColors.green,
    fontWeight: '600',
  },
});

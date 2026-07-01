import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { completeOAuthAndRoute } from '@/src/services/onboardingOAuthRouting';
import { syncAuthUserFromSession } from '@/src/services/authService';
import { setOAuthIntent } from '@/src/services/onboardingFlowState';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { SmartCartColors } from '@/src/theme/smartCart';

const BOOT_LABEL = 'Signing you in';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (cancelled) return;
        if (intent === 'signup') {
          await setOAuthIntent('signup');
        }
        if (intent === 'email-change') {
          await syncAuthUserFromSession();
          router.replace('/settings?emailChanged=1');
          return;
        }
        await completeOAuthAndRoute(router, completeOnboarding);
      } catch (callbackError) {
        if (!cancelled) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : 'Sign-in could not be completed. Please try again.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completeOnboarding, intent, router]);

  return (
    <View style={styles.boot} accessibilityRole="progressbar" accessibilityLabel={BOOT_LABEL}>
      <PennyPantryLogo variant="hero" size={72} style={styles.bootLogo} />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
          <Text style={styles.bootText}>{BOOT_LABEL}…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: SmartCartColors.background,
    paddingHorizontal: 24,
  },
  bootLogo: {
    marginBottom: 8,
  },
  bootText: {
    fontSize: 15,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: SmartCartColors.danger,
    textAlign: 'center',
  },
});

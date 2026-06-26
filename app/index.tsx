import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import {
  loadAuthRoutingContext,
  recordActivityTimestamp,
  resolveInitialRoute,
} from '@/src/services/authRoutingService';
import { signOut } from '@/src/services/authService';
import { SmartCartColors } from '@/src/theme/smartCart';
import { useBudgetStore } from '@/src/store/useBudgetStore';

const BOOT_LABEL = 'Loading Penny Pantry';

export default function RootIndex() {
  const onboardingReady = useBudgetStore((s) => s.onboardingReady);
  const onboardingComplete = useBudgetStore((s) => s.onboardingComplete);
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    if (!onboardingReady) return;

    let cancelled = false;

    void (async () => {
      const routingContext = await loadAuthRoutingContext(onboardingComplete);
      const route = resolveInitialRoute(routingContext);

      if (route.requiresSignOut) {
        await signOut();
      }

      if (!cancelled) {
        await recordActivityTimestamp();
        setTarget(route.href as Href);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onboardingReady, onboardingComplete]);

  if (!onboardingReady || !target) {
    return (
      <View style={styles.boot} accessibilityRole="progressbar" accessibilityLabel={BOOT_LABEL}>
        <PennyPantryLogo variant="hero" size={72} style={styles.bootLogo} />
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
        <Text style={styles.bootText}>{BOOT_LABEL}…</Text>
      </View>
    );
  }

  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: SmartCartColors.background,
  },
  bootLogo: {
    marginBottom: 8,
  },
  bootText: {
    fontSize: 15,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
  },
});

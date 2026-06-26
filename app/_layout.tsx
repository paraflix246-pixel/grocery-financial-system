import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { BackButton } from '@/src/components/BackButton';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { DevConnectionBanner } from '@/src/components/DevConnectionBanner';
import { StorageSlowBanner } from '@/src/components/StorageSlowBanner';
import { GlobalErrorBoundary, ErrorBoundary } from '@/src/components/GlobalErrorBoundary';
import { UpgradePromptProvider } from '@/src/components/UpgradePromptProvider';
import { TrialReminderProvider } from '@/src/components/TrialReminderProvider';
import { SmartCartColors } from '@/src/theme/smartCart';
import { initStorage } from '@/src/services/storageService';
import { bootstrapExternalPriceProviders } from '@/src/services/externalPriceBootstrap';
import {
  getSession,
  maybeSendWelcomeEmail,
  syncAuthUserFromSession,
  syncProfileDisplayNameFromAuth,
} from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useListStore } from '@/src/store/useListStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { initializeSubscriptionProvider } from '@/src/services/subscriptionService';
import { ensureTrialExpiredDowngrade } from '@/src/services/trialService';
import { canAccessWorkspaceFeature } from '@/src/services/featureGateService';
import { startFamilyRealtimeSync } from '@/src/services/familySyncService';
import { AuthSessionGuard } from '@/src/components/AuthSessionGuard';

export { ErrorBoundary };

SplashScreen.preventAutoHideAsync();

const APP_INIT_KEY = '__grocery_financial_app_init__';
const INIT_STEP_TIMEOUT_MS = __DEV__ ? 12_000 : 8_000;
const INIT_STORAGE_TIMEOUT_MS = 12_000;
const INIT_TOTAL_TIMEOUT_MS = 15_000;
const FONT_LOAD_TIMEOUT_MS = Platform.OS === 'web' ? 2_000 : 8_000;
const BOOT_LABEL = 'Loading Penny Pantry';

type AppInitState = {
  promise: Promise<void> | null;
  initialized: boolean;
  lastError: string | null;
};

function getAppInitState(): AppInitState {
  const globalState = globalThis as typeof globalThis & {
    [APP_INIT_KEY]?: AppInitState;
  };
  if (!globalState[APP_INIT_KEY]) {
    globalState[APP_INIT_KEY] = { promise: null, initialized: false, lastError: null };
  }
  return globalState[APP_INIT_KEY];
}

let moduleInitStarted = false;

function waitForWebFirstPaint(): Promise<void> {
  if (Platform.OS !== 'web' || typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    }),
  ]);
}

async function runInitStep(
  label: string,
  step: () => Promise<void>,
  timeoutMs = INIT_STEP_TIMEOUT_MS
): Promise<void> {
  try {
    await withTimeout(step(), timeoutMs, label);
  } catch (error) {
    console.error(`App init step failed (${label}):`, error);
  }
}

function ensureAppInitialized(): Promise<void> {
  const state = getAppInitState();
  if (state.initialized) return Promise.resolve();
  if (state.promise) return state.promise;

  const initWork = (async () => {
    await waitForWebFirstPaint();
    await runInitStep('storage', initStorage, INIT_STORAGE_TIMEOUT_MS);
    await runInitStep('price providers', bootstrapExternalPriceProviders);
    await runInitStep('budget settings', () => useBudgetStore.getState().loadSettings());
    await runInitStep('app settings', () => useSettingsStore.getState().loadSettings());
    await runInitStep('profile name', async () => {
      const session = await getSession();
      if (session) {
        await syncProfileDisplayNameFromAuth();
      }
    });
    await runInitStep('subscription provider', () => initializeSubscriptionProvider());
    await runInitStep('subscription', async () => {
      await useSubscriptionStore.getState().loadSubscription();
      const { tier, subscriptionSource } = useSubscriptionStore.getState();
      const isPaidPro =
        tier === 'pro' && subscriptionSource !== 'trial' && subscriptionSource !== 'free';
      const downgraded = await ensureTrialExpiredDowngrade(isPaidPro);
      if (downgraded) {
        await useSubscriptionStore.getState().downgradeToFree();
      }
    });
    await runInitStep('workspaces', () => useWorkspaceStore.getState().loadWorkspaces());
    await runInitStep('lists', () => useListStore.getState().loadLists());
    await runInitStep('onboarding', async () => {
      // If a valid Supabase session exists, treat onboarding as complete regardless
      // of the AsyncStorage flag (handles reinstalls and cross-device sign-ins).
      const session = await getSession();
      if (session) {
        await useBudgetStore.getState().completeOnboarding();
      } else {
        await useBudgetStore.getState().checkOnboarding();
      }
    });
  })();

  state.promise = withTimeout(initWork, INIT_TOTAL_TIMEOUT_MS, 'App init')
    .catch((error) => {
      state.lastError = error instanceof Error ? error.message : String(error);
      console.error('App initialization failed:', error);
    })
    .finally(() => {
      state.initialized = true;
    });

  return state.promise;
}

function FamilyRealtimeBootstrap() {
  const hasWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const syncUnlocked = canAccessWorkspaceFeature();
  useEffect(() => {
    if (!syncUnlocked) return;
    void startFamilyRealtimeSync().catch((error) => {
      console.warn('[familySync] realtime start failed:', error);
    });
  }, [hasWorkspaceSub, syncUnlocked]);
  return null;
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [fontsTimedOut, setFontsTimedOut] = useState(Platform.OS === 'web');
  const onboardingComplete = useBudgetStore((s) => s.onboardingComplete);
  const onboardingReady = useBudgetStore((s) => s.onboardingReady);
  const fontsReady =
    Platform.OS === 'web' || loaded || fontsTimedOut || Boolean(fontError);
  const router = useRouter();
  const segments = useSegments();
  const isPublicRoute =
    segments[0] === 'privacy' ||
    segments[0] === 'terms' ||
    segments[0] === 'reset-password';
  const isOnboardingRoute = segments[0] === 'onboarding';

  useEffect(() => {
    if (fontError) {
      console.warn('Custom font failed to load; using system fonts.', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsReady) return;
    const timer = setTimeout(() => {
      console.warn('Font load timed out; continuing with system fonts.');
      setFontsTimedOut(true);
    }, FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fontsReady]);

  useEffect(() => {
    if (!moduleInitStarted) {
      moduleInitStarted = true;
    }
    ensureAppInitialized().catch((initError) => {
      console.error('App initialization failed:', initError);
    });
  }, []);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  // Redirect deep links to onboarding once boot has resolved onboarding state.
  useEffect(() => {
    if (!onboardingReady || onboardingComplete || isPublicRoute || isOnboardingRoute) {
      return;
    }
    router.replace('/onboarding' as Href);
  }, [onboardingReady, onboardingComplete, isPublicRoute, isOnboardingRoute, router]);

  // Listen for Supabase auth state changes to handle token refresh and sign-out.
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        void syncAuthUserFromSession();
        void maybeSendWelcomeEmail();
        useBudgetStore.getState().completeOnboarding();
      } else if (event === 'SIGNED_OUT') {
        // Only redirect to onboarding if onboarding wasn't completed as guest
        useBudgetStore.getState().checkOnboarding();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!fontsReady) {
    return (
      <GlobalErrorBoundary>
        <GestureHandlerRootView style={[styles.root, styles.boot]}>
          <View style={styles.bootContent} accessibilityRole="progressbar" accessibilityLabel={BOOT_LABEL}>
            <PennyPantryLogo variant="hero" size={72} style={styles.bootLogo} />
            <ActivityIndicator size="large" color={SmartCartColors.primary} />
            <Text style={styles.bootText}>{BOOT_LABEL}…</Text>
          </View>
        </GestureHandlerRootView>
      </GlobalErrorBoundary>
    );
  }

  return (
    <GlobalErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <UpgradePromptProvider>
            <TrialReminderProvider>
              <FamilyRealtimeBootstrap />
              <AuthSessionGuard />
              <DevConnectionBanner />
              <StorageSlowBanner />
              <RootLayoutNav />
            </TrialReminderProvider>
          </UpgradePromptProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GlobalErrorBoundary>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: SmartCartColors.background },
          contentStyle: {
            backgroundColor: SmartCartColors.background,
            overflow: 'hidden',
          },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lists" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { backgroundColor: SmartCartColors.background },
  bootContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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

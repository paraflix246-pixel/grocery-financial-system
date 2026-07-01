import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { Lora_400Regular } from '@expo-google-fonts/lora';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { BackButton } from '@/src/components/BackButton';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { DevConnectionBanner } from '@/src/components/DevConnectionBanner';
import { DevFamilyPreviewBanner } from '@/src/components/DevFamilyPreviewBanner';
import { DevFamilyPreviewBootstrap } from '@/src/components/DevFamilyPreviewBootstrap';
import { ProAppearanceScopeGuard } from '@/src/components/ProAppearanceScopeGuard';
import { MaintenanceBanner } from '@/src/components/MaintenanceBanner';
import { StorageSlowBanner } from '@/src/components/StorageSlowBanner';
import { GlobalErrorBoundary, ErrorBoundary } from '@/src/components/GlobalErrorBoundary';
import { UpgradePromptProvider } from '@/src/components/UpgradePromptProvider';
import { TrialReminderProvider } from '@/src/components/TrialReminderProvider';
import { SmartCartColors } from '@/src/theme/smartCart';
import { AppThemeProvider, loadStoredThemeId } from '@/src/theme/AppThemeProvider';
import type { AppThemeId } from '@/src/theme/appThemes';
import { applyThemeById, readStoredThemeIdSync } from '@/src/theme/themeStorage';
import { AppFontProvider } from '@/src/theme/AppFontProvider';
import { AvatarProvider } from '@/src/components/avatars/AvatarProvider';
import { initI18n, i18n } from '@/src/i18n';
import { initStorage } from '@/src/services/storageService';
import { bootstrapExternalPriceProviders } from '@/src/services/externalPriceBootstrap';
import { syncUserProfile } from '@/src/services/admin/adminApiService';
import {
  getSession,
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
import { FamilyCheckoutSuccessSync } from '@/src/components/FamilyCheckoutSuccessSync';
import { ReceiptProcessingBootstrap } from '@/src/components/ReceiptProcessingBootstrap';

export { ErrorBoundary };

SplashScreen.preventAutoHideAsync();

const APP_INIT_KEY = '__grocery_financial_app_init__';
const INIT_STEP_TIMEOUT_MS = __DEV__ ? 12_000 : 8_000;
const INIT_STORAGE_TIMEOUT_MS = 12_000;
const INIT_TOTAL_TIMEOUT_MS = 15_000;
const FONT_LOAD_TIMEOUT_MS = Platform.OS === 'web' ? 2_000 : 8_000;
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
    await runInitStep('i18n', initI18n);
    await runInitStep('storage', initStorage, INIT_STORAGE_TIMEOUT_MS);
    await runInitStep('core stores', async () => {
      await Promise.all([
        bootstrapExternalPriceProviders(),
        useBudgetStore.getState().loadSettings(),
        useSettingsStore.getState().loadSettings(),
        initializeSubscriptionProvider(),
      ]);
    });
    await runInitStep('notifications', async () => {
      const { initializeNotificationSystem } = await import('@/src/services/notificationService');
      await initializeNotificationSystem();
    });
    await runInitStep('profile name', async () => {
      const session = await getSession();
      if (session) {
        await syncProfileDisplayNameFromAuth();
      }
    });
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
    await runInitStep('workspaces and lists', async () => {
      await Promise.all([
        useWorkspaceStore.getState().loadWorkspaces(),
        useListStore.getState().loadLists(),
      ]);
    });
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
    Inter_400Regular,
    Nunito_600SemiBold,
    Lora_400Regular,
    Poppins_700Bold,
  });
  const [fontsTimedOut, setFontsTimedOut] = useState(Platform.OS === 'web');
  const [localeReady, setLocaleReady] = useState(false);
  const [bootThemeId, setBootThemeId] = useState<AppThemeId | null>(() => {
    const sync = readStoredThemeIdSync();
    if (sync) {
      applyThemeById(sync);
      return sync;
    }
    return null;
  });
  const onboardingComplete = useBudgetStore((s) => s.onboardingComplete);
  const onboardingReady = useBudgetStore((s) => s.onboardingReady);
  const fontsReady =
    Platform.OS === 'web' || loaded || fontsTimedOut || Boolean(fontError);
  const bootReady = fontsReady && localeReady && bootThemeId !== null;
  const router = useRouter();
  const segments = useSegments();
  const isPublicRoute =
    segments[0] === 'privacy' ||
    segments[0] === 'terms' ||
    segments[0] === 'reset-password' ||
    segments[0] === 'admin' ||
    segments[0] === 'auth';
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
    if (bootThemeId !== null) {
      applyThemeById(bootThemeId);
      return;
    }
    void loadStoredThemeId().then((id) => {
      applyThemeById(id);
      setBootThemeId(id);
    });
  }, [bootThemeId]);

  useEffect(() => {
    if (!moduleInitStarted) {
      moduleInitStarted = true;
    }
    ensureAppInitialized()
      .then(() => initI18n())
      .then(() => setLocaleReady(true))
      .catch((initError) => {
        console.error('App initialization failed:', initError);
        setLocaleReady(true);
      });
  }, []);

  useEffect(() => {
    if (bootReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootReady]);

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
        // Defer async Supabase calls — invoking auth APIs inside this callback can deadlock.
        setTimeout(() => {
          void syncAuthUserFromSession();
          void syncUserProfile({ force: true });
          useBudgetStore.getState().completeOnboarding();
        }, 0);
      } else if (event === 'USER_UPDATED' && session) {
        setTimeout(() => {
          void syncAuthUserFromSession();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Only redirect to onboarding if onboarding wasn't completed as guest
        useBudgetStore.getState().checkOnboarding();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!bootReady) {
    return (
      <GlobalErrorBoundary>
        <GestureHandlerRootView
          style={[styles.root, { backgroundColor: SmartCartColors.background }]}>
          <View style={styles.bootContent} accessibilityRole="progressbar" accessibilityLabel="Loading">
            <PennyPantryLogo variant="hero" size={72} style={styles.bootLogo} />
            <ActivityIndicator size="large" color={SmartCartColors.primary} />
            <Text style={[styles.bootText, { color: SmartCartColors.textSecondary }]}>
              Loading Penny Pantry…
            </Text>
          </View>
        </GestureHandlerRootView>
      </GlobalErrorBoundary>
    );
  }

  return (
    <GlobalErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AppThemeProvider initialThemeId={bootThemeId ?? undefined}>
          <AppFontProvider>
            <AvatarProvider>
              <GestureHandlerRootView style={styles.root}>
                <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                  <UpgradePromptProvider>
                    <TrialReminderProvider>
                      <FamilyCheckoutSuccessSync />
                      <ReceiptProcessingBootstrap />
                      <FamilyRealtimeBootstrap />
                      <DevFamilyPreviewBootstrap />
                      <ProAppearanceScopeGuard />
                      <AuthSessionGuard />
                      <DevConnectionBanner />
                      <DevFamilyPreviewBanner />
                      <MaintenanceBanner />
                      <StorageSlowBanner />
                      <RootLayoutNav />
                    </TrialReminderProvider>
                  </UpgradePromptProvider>
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </AvatarProvider>
          </AppFontProvider>
        </AppThemeProvider>
      </I18nextProvider>
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
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings/index"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: SmartCartColors.background,
              overflow: 'visible',
            },
          }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: SmartCartColors.background,
              overflow: 'visible',
            },
          }}
        />
        <Stack.Screen
          name="settings/privacy"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: SmartCartColors.background,
              overflow: 'visible',
            },
          }}
        />
        <Stack.Screen
          name="settings/budget"
          options={{
            contentStyle: {
              backgroundColor: SmartCartColors.background,
              overflow: 'visible',
            },
          }}
        />
        <Stack.Screen
          name="family_plans/index"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: SmartCartColors.background,
              overflow: 'visible',
            },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  },
});

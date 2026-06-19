import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { OnboardingModal } from '@/src/components/OnboardingModal';
import { initStorage } from '@/src/services/storageService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useListStore } from '@/src/store/useListStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const APP_INIT_KEY = '__grocery_financial_app_init__';

type AppInitState = {
  promise: Promise<void> | null;
  initialized: boolean;
};

function getAppInitState(): AppInitState {
  const globalState = globalThis as typeof globalThis & {
    [APP_INIT_KEY]?: AppInitState;
  };
  if (!globalState[APP_INIT_KEY]) {
    globalState[APP_INIT_KEY] = { promise: null, initialized: false };
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

function ensureAppInitialized(): Promise<void> {
  const state = getAppInitState();
  if (state.initialized) return Promise.resolve();
  if (state.promise) return state.promise;

  state.promise = (async () => {
    await waitForWebFirstPaint();
    await initStorage();
    await useBudgetStore.getState().loadSettings();
    await useListStore.getState().loadLists();
    await useBudgetStore.getState().checkOnboarding();
    state.initialized = true;
  })().catch((error) => {
    if (!state.initialized) {
      state.promise = null;
    }
    throw error;
  });

  return state.promise;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const onboardingComplete = useBudgetStore((s) => s.onboardingComplete);
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (moduleInitStarted && getAppInitState().initialized) {
      setDbReady(true);
      return;
    }
    moduleInitStarted = true;

    let cancelled = false;
    ensureAppInitialized()
      .then(() => {
        if (!cancelled) setDbReady(true);
      })
      .catch((initError) => {
        console.error('App initialization failed:', initError);
        // Avoid an indefinite blank screen if storage init fails (common on web SQLite).
        if (!cancelled) setDbReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady]);

  if (!loaded || !dbReady) return null;

  return (
    <SafeAreaProvider>
      <RootLayoutNav />
      {!onboardingComplete ? (
        <OnboardingModal visible onComplete={() => completeOnboarding()} />
      ) : null}
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="list/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/preview" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/edit" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/link" options={{ title: 'Link to List' }} />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings/budget" options={{ headerShown: false }} />
        <Stack.Screen name="price-alerts" options={{ headerShown: false }} />
        <Stack.Screen name="stores" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

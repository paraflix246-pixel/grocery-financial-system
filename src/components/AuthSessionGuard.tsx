import { usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { LoginPromptModal } from '@/src/components/LoginPromptModal';
import {
  isProtectedAppRoute,
  loadAuthRoutingContext,
  recordActivityTimestamp,
  shouldPromptLogin,
  WEB_IDLE_TIMEOUT_MS,
} from '@/src/services/authRoutingService';
import { signOut } from '@/src/services/authService';
import { buildPostLogoutHref } from '@/src/services/authRoutingLogic';
import { useBudgetStore } from '@/src/store/useBudgetStore';

const IDLE_CHECK_INTERVAL_MS = 60_000;

export function AuthSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const onboardingReady = useBudgetStore((s) => s.onboardingReady);
  const onboardingComplete = useBudgetStore((s) => s.onboardingComplete);
  const [promptReason, setPromptReason] = useState<ReturnType<typeof shouldPromptLogin>>(null);
  const handlingRef = useRef(false);

  const touchActivity = useCallback(() => {
    void recordActivityTimestamp();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    for (const event of events) {
      window.addEventListener(event, touchActivity, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, touchActivity);
      }
    };
  }, [touchActivity]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        touchActivity();
      }
    });
    return () => sub.remove();
  }, [touchActivity]);

  useEffect(() => {
    if (!onboardingReady || !onboardingComplete) return;

    const interval = setInterval(() => {
      void (async () => {
        if (handlingRef.current) return;
        const routingContext = await loadAuthRoutingContext(onboardingComplete);
        const reason = shouldPromptLogin(routingContext);
        if (!reason) return;

        handlingRef.current = true;
        try {
          if (routingContext.hasSupabaseSession) {
            await signOut();
          }
          if (isProtectedAppRoute(pathname)) {
            setPromptReason(reason);
          } else {
            router.replace(buildPostLogoutHref({ returnTo: '/(tabs)' }) as Href);
          }
        } finally {
          handlingRef.current = false;
        }
      })();
    }, IDLE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [onboardingReady, onboardingComplete, pathname, router]);

  return (
    <LoginPromptModal
      visible={promptReason !== null}
      reason={promptReason ?? 'session_expired'}
      returnTo="/(tabs)"
      onDismiss={() => setPromptReason(null)}
    />
  );
}

export { WEB_IDLE_TIMEOUT_MS };

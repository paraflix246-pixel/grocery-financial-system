import { Platform } from 'react-native';
import type { Href } from 'expo-router';

import { syncUserProfile } from '@/src/services/admin/adminApiService';
import { recordActivityTimestamp } from '@/src/services/authRoutingService';
import { syncAuthUserFromSession } from '@/src/services/authService';
import { consumeOAuthIntent, consumeOAuthReturnTo } from '@/src/services/onboardingFlowState';
import { resolvePostOAuthRoute } from '@/src/services/postAuthRoutingLogic';

type CompleteOnboarding = () => Promise<void>;

type OAuthRouter = {
  replace: (href: Href) => void;
};

/** Shared post-OAuth navigation for web callback and native inline OAuth completion. */
export async function completeOAuthAndRoute(
  router: OAuthRouter,
  completeOnboarding: CompleteOnboarding
): Promise<void> {
  await syncAuthUserFromSession();
  await syncUserProfile({ force: true });
  await recordActivityTimestamp();

  const oauthIntent = await consumeOAuthIntent();
  const returnTo = await consumeOAuthReturnTo();
  const platform = Platform.OS === 'web' ? 'web' : 'native';
  const route = resolvePostOAuthRoute(false, platform, oauthIntent);

  if (route.reason === 'upgrade' && returnTo) {
    await completeOnboarding();
    router.replace(decodeURIComponent(returnTo) as Href);
    return;
  }

  if (route.reason === 'join_household') {
    await completeOnboarding();
  }

  router.replace(route.href as Href);
}

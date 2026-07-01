import type { Href } from 'expo-router';

import { buildPostLogoutHref } from '@/src/services/authRoutingLogic';
import { signOut } from '@/src/services/authService';

type RouterLike = {
  replace: (href: Href) => void;
};

/** Clear session and navigate to the post-logout sign-in screen. */
export async function signOutAndNavigate(
  router: RouterLike,
  options?: { returnTo?: string }
): Promise<void> {
  await signOut();
  router.replace(buildPostLogoutHref(options) as Href);
}

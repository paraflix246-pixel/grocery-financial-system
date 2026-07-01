import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { startDevFamilyWorkspacePreview } from '@/src/services/devFamilyWorkspacePreview';
import {
  buildDevFamilyPreviewSignInHref,
  hasDevFamilyPreviewUser,
} from '@/src/utils/devFamilyPreviewAuth';

function isTruthyPreviewFlag(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return false;
  const normalized = raw.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'family' || normalized === 'household';
}

const PREVIEW_RETURN_PATH = '/(tabs)?preview=family';

/** DEV-only: `?preview=family` on any route enables Household preview and opens home. */
export function DevFamilyPreviewBootstrap() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ preview?: string | string[] }>();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!__DEV__ || startedRef.current) return;
    if (!isTruthyPreviewFlag(params.preview)) return;

    startedRef.current = true;
    void (async () => {
      const hasUser = await hasDevFamilyPreviewUser();
      if (!hasUser) {
        router.replace(buildDevFamilyPreviewSignInHref(PREVIEW_RETURN_PATH));
        return;
      }
      await startDevFamilyWorkspacePreview(router, 'home');
    })();
  }, [params.preview, router]);

  return null;
}

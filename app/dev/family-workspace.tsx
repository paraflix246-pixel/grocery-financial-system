import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import {
  DEV_FAMILY_WORKSPACE_ROUTE,
  startDevFamilyWorkspacePreview,
} from '@/src/services/devFamilyWorkspacePreview';
import { SmartCartColors } from '@/src/theme/smartCart';
import {
  buildDevFamilyPreviewSignInHref,
  hasDevFamilyPreviewUser,
} from '@/src/utils/devFamilyPreviewAuth';

/** DEV-only deep link: enables Household preview (no Stripe) and opens the home tab. */
export default function DevFamilyWorkspaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/(tabs)' as never);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const hasUser = await hasDevFamilyPreviewUser();
      if (!hasUser) {
        router.replace(buildDevFamilyPreviewSignInHref(DEV_FAMILY_WORKSPACE_ROUTE));
        return;
      }

      try {
        const ready = await startDevFamilyWorkspacePreview(router, 'home');
        if (!ready) {
          setError(t('devFamilyPreview.signInRequired'));
        }
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : t('devFamilyPreview.enableFailed')
        );
      }
    })();
  }, [router, t]);

  const goToSignIn = () => {
    router.push(buildDevFamilyPreviewSignInHref(DEV_FAMILY_WORKSPACE_ROUTE));
  };

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.title}>{t('devFamilyPreview.routeTitle')}</Text>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.signInBtn} onPress={goToSignIn}>
            <Text style={styles.signInBtnText}>{t('common.signIn')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
          <Text style={styles.loading}>{t('devFamilyPreview.enabling')}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: SmartCartColors.background,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  loading: { fontSize: 14, color: SmartCartColors.textMuted, textAlign: 'center' },
  error: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  signInBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: SmartCartColors.primary,
  },
  signInBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

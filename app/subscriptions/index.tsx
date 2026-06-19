import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tier, plan, expiresAt, loaded, loadSubscription, downgradeToFree } = useSubscriptionStore();

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleDowngrade = () => {
    Alert.alert('Downgrade to Free?', 'You will lose access to Pro features.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Downgrade',
        style: 'destructive',
        onPress: () => downgradeToFree(),
      },
    ]);
  };

  const isPro = tier === 'pro';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Subscription" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, isPro && styles.statusCardPro]}>
          <SymbolView
            name={{ ios: isPro ? 'star.fill' : 'person.fill', android: isPro ? 'star' : 'person', web: isPro ? 'star' : 'person' }}
            tintColor={isPro ? SmartCartColors.accentPurple : SmartCartColors.textSecondary}
            size={32}
          />
          <Text style={styles.statusTitle}>{isPro ? 'SmartCart Pro' : 'SmartCart Free'}</Text>
          <Text style={styles.statusSub}>
            {isPro
              ? `${plan === 'yearly' ? 'Annual' : 'Monthly'} plan · mock local subscription`
              : 'Upgrade for advanced insights and community pricing'}
          </Text>
          {isPro && expiresAt && (
            <Text style={styles.expires}>Renews {formatDisplayDate(expiresAt.split('T')[0])}</Text>
          )}
        </View>

        {isPro ? (
          <>
            <Text style={styles.sectionTitle}>Active benefits</Text>
            {['AI Insights Pro', 'Inflation tracker', 'Community pricing', 'Family sharing', 'API access'].map(
              (benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <SymbolView
                    name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                    tintColor={SmartCartColors.primary}
                    size={18}
                  />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              )
            )}
            <Pressable style={styles.downgradeBtn} onPress={handleDowngrade}>
              <Text style={styles.downgradeText}>Downgrade to Free</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall' as never)}>
            <Text style={styles.upgradeBtnText}>View Pro plans</Text>
          </Pressable>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Local-first billing</Text>
          <Text style={styles.infoBody}>
            Subscriptions are stored on this device for MVP testing. A production build would connect to App Store / Play Store billing.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  statusCard: {
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  statusCardPro: { borderColor: SmartCartColors.accentPurple, backgroundColor: '#FAF5FF' },
  statusTitle: { fontSize: 22, fontWeight: '800', color: SmartCartColors.text, marginTop: 12 },
  statusSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4, textAlign: 'center' },
  expires: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 15, color: SmartCartColors.text },
  upgradeBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...SmartCartShadow.card,
  },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  downgradeBtn: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.danger,
  },
  downgradeText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.danger },
  infoCard: {
    marginTop: 24,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  infoBody: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 6, lineHeight: 19 },
});

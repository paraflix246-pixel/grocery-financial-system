import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { PRO_PLAN_FEATURES, proMonthlyLabel } from '@/src/constants/proPricing';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { getSubscriptionBillingMode, restoreSubscriptionPurchases } from '@/src/services/subscriptionService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const { tier, plan, expiresAt, loaded, loadSubscription, downgradeToFree } = useSubscriptionStore();

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleDowngrade = () => {
    Alert.alert('Downgrade to Free?', 'You will lose unlimited scanning, live price alerts, and full price history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Downgrade',
        style: 'destructive',
        onPress: () => downgradeToFree(),
      },
    ]);
  };

  const isPaid = tier === 'pro' || tier === 'household';
  const billingMode = getSubscriptionBillingMode();
  const planLabel = isPaid ? 'Penny Pantry Pro' : 'Penny Pantry Free';

  const billingStatusLabel =
    billingMode === 'revenuecat'
      ? `${plan === 'yearly' ? 'Annual' : 'Monthly'} · billed via App Store / Play Store`
      : billingMode === 'mock'
        ? `${plan === 'yearly' ? 'Annual' : 'Monthly'} plan · dev mock subscription`
        : `${plan === 'yearly' ? 'Annual' : 'Monthly'} plan · local only`;

  const handleRestore = async () => {
    const result = await restoreSubscriptionPurchases();
    if (result.success && result.state.tier !== 'free') {
      await loadSubscription();
      Alert.alert('Restored', 'Your subscription is active on this device.');
      return;
    }
    Alert.alert('No subscription found', result.error ?? 'No active subscription to restore.');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Subscription" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, isPaid && styles.statusCardPro]}>
          <SymbolView
            name={{
              ios: isPaid ? 'star.fill' : 'person.fill',
              android: isPaid ? 'star' : 'person',
              web: isPaid ? 'star' : 'person',
            }}
            tintColor={isPaid ? SmartCartColors.accentPurple : SmartCartColors.textSecondary}
            size={32}
          />
          <Text style={styles.statusTitle}>{planLabel}</Text>
          <Text style={styles.statusSub}>
            {isPaid
              ? billingStatusLabel
              : `Upgrade for price drop alerts, family sync & live store comparison — from ${proMonthlyLabel}`}
          </Text>
          {isPaid && expiresAt && (
            <Text style={styles.expires}>Renews {formatDisplayDate(expiresAt.split('T')[0])}</Text>
          )}
        </View>

        {isPaid ? (
          <>
            <Text style={styles.sectionTitle}>Your Pro benefits</Text>
            {PRO_PLAN_FEATURES.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <SymbolView
                  name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                  tintColor={SmartCartColors.primary}
                  size={18}
                />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}

            <Pressable style={styles.downgradeBtn} onPress={handleDowngrade}>
              <Text style={styles.downgradeText}>Downgrade to Free</Text>
            </Pressable>

            {billingMode === 'revenuecat' ? (
              <Pressable style={styles.restoreBtn} onPress={() => void handleRestore()}>
                <Text style={styles.restoreText}>Restore purchases</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall' as never)}>
            <Text style={styles.upgradeBtnText}>Compare Free & Pro</Text>
          </Pressable>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            {billingMode === 'revenuecat' ? 'Store billing' : 'Billing status'}
          </Text>
          <Text style={styles.infoBody}>
            {billingMode === 'revenuecat'
              ? 'Subscriptions are managed by Apple or Google. Cancel anytime in your device subscription settings; access continues until the period ends.'
              : billingMode === 'mock'
                ? 'Dev mock mode — subscriptions are stored locally for testing tier gates without App Store / Play billing.'
                : 'Native billing is not configured. Add RevenueCat keys and rebuild with EAS to enable real Pro purchases.'}
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
  benefitText: { fontSize: 15, color: SmartCartColors.text, flex: 1, lineHeight: 21 },
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
  restoreBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  restoreText: { fontSize: 14, fontWeight: '600', color: SmartCartColors.textSecondary },
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

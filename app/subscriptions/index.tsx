import { useRouter, useLocalSearchParams } from 'expo-router';

import { useEffect, useState } from 'react';

import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SymbolView } from 'expo-symbols';



import { Text } from '@/components/Themed';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { ProPlanFeaturesList } from '@/src/components/ProPlanFeaturesList';
import { TrialBadge } from '@/src/components/TrialReminderProvider';
import { proMonthlyLabel } from '@/src/constants/proPricing';
import { computeTrialStatus } from '@/src/services/trialService';

import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

import { getSubscriptionBillingMode, restoreSubscriptionPurchases } from '@/src/services/subscriptionService';
import { redirectToStripePortal } from '@/src/services/stripeSubscriptionService';

import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

import { formatDisplayDate } from '@/src/utils/dateParser';



export default function SubscriptionsScreen() {

  const router = useRouter();
  const { stripe } = useLocalSearchParams<{ stripe?: string }>();
  const [openingPortal, setOpeningPortal] = useState(false);

  const { tier, plan, expiresAt, loaded, loadSubscription, downgradeToFree, subscriptionSource, trialStartedAt, isPro } =
    useSubscriptionStore();



  useEffect(() => {

    loadSubscription();

  }, [loadSubscription]);

  useEffect(() => {
    if (stripe === 'success') {
      void loadSubscription().then(() => {
        Alert.alert('Welcome to Pro', 'Your Stripe subscription is active.');
      });
    }
  }, [stripe, loadSubscription]);



  const handleDowngrade = () => {

    Alert.alert('Downgrade to Free?', 'You will lose unlimited scanning, smart sale alerts, and full price history.', [

      { text: 'Cancel', style: 'cancel' },

      {

        text: 'Downgrade',

        style: 'destructive',

        onPress: () => downgradeToFree(),

      },

    ]);

  };



  const isPaid = isPro();
  const isTrial = subscriptionSource === 'trial';
  const trialStatus = computeTrialStatus(trialStartedAt);

  const billingMode = getSubscriptionBillingMode();

  const planLabel = isTrial
    ? 'Penny Pantry Pro (Trial)'
    : isPaid
      ? 'Penny Pantry Pro'
      : 'Penny Pantry Free';

  const billingStatusLabel = isTrial
    ? `7-day Pro trial · ${trialStatus.daysRemaining} ${trialStatus.daysRemaining === 1 ? 'day' : 'days'} left`
    : billingMode === 'stripe'
      ? `${plan === 'yearly' ? 'Annual' : 'Monthly'} · billed via Stripe`
      : billingMode === 'revenuecat'

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

  const handleManageStripe = async () => {
    setOpeningPortal(true);
    try {
      await redirectToStripePortal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open billing portal.';
      Alert.alert('Billing portal', message);
    } finally {
      setOpeningPortal(false);
    }
  };

  const isStripePaid = billingMode === 'stripe' && isPaid && subscriptionSource === 'paid';


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

          {isTrial ? (
            <View style={styles.trialBadgeWrap}>
              <TrialBadge />
            </View>
          ) : null}

          <Text style={styles.statusSub}>

            {isPaid

              ? billingStatusLabel

              : `Upgrade for price drop alerts, household sync & multi-store comparison — from ${proMonthlyLabel}`}

          </Text>

          {isPaid && expiresAt && (

            <Text style={styles.expires}>Renews {formatDisplayDate(expiresAt.split('T')[0])}</Text>

          )}

        </View>



        {isPaid ? (

          <>

            <Text style={styles.sectionTitle}>Your Pro benefits</Text>
            <ProPlanFeaturesList
              variant="grouped"
              accentColor={SmartCartColors.primary}
              mutedColor={SmartCartColors.textSecondary}
              featureTextStyle={styles.benefitText}
            />



            {isStripePaid ? (
              <Pressable
                style={styles.upgradeBtn}
                disabled={openingPortal}
                onPress={() => void handleManageStripe()}>
                <Text style={styles.upgradeBtnText}>
                  {openingPortal ? 'Opening portal…' : 'Manage subscription'}
                </Text>
              </Pressable>
            ) : (
              <Pressable style={styles.downgradeBtn} onPress={handleDowngrade}>
                <Text style={styles.downgradeText}>Downgrade to Free</Text>
              </Pressable>
            )}



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

            {billingMode === 'stripe'
              ? 'Stripe billing'
              : billingMode === 'revenuecat'
                ? 'Store billing'
                : 'Billing status'}

          </Text>

          <Text style={styles.infoBody}>

            {billingMode === 'stripe'
              ? 'Subscriptions are managed securely by Stripe. Cancel anytime from Manage subscription; access continues until the period ends.'
              : billingMode === 'revenuecat'

              ? 'Subscriptions are managed by Apple or Google. Cancel anytime in your device subscription settings; access continues until the period ends.'

              : billingMode === 'mock'

                ? 'Dev mock mode — subscriptions are stored locally for testing tier gates without App Store / Play billing.'

                : Platform.OS === 'web'
                  ? 'Web billing is not configured. Add Stripe env vars on Vercel to enable Pro checkout.'
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

  trialBadgeWrap: { marginTop: 10 },

  statusSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4, textAlign: 'center' },

  expires: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 8 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },

  benefitText: {
    fontSize: 13,
    color: SmartCartColors.text,
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },

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


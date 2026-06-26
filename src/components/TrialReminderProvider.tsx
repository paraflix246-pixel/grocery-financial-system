import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UpgradePromptModal } from '@/src/components/UpgradePromptModal';
import {
  getTrialReminderLevel,
  markTrialReminderModalShown,
  trialBannerMessage,
  trialModalHeadline,
  wasTrialReminderModalShownThisSession,
} from '@/src/services/trialReminderService';
import { computeTrialStatus } from '@/src/services/trialService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  children?: ReactNode;
};

export function TrialReminderProvider({ children }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subscriptionSource = useSubscriptionStore((s) => s.subscriptionSource);
  const trialStartedAt = useSubscriptionStore((s) => s.trialStartedAt);
  const [modalVisible, setModalVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const trialStatus = useMemo(
    () => computeTrialStatus(trialStartedAt),
    [trialStartedAt]
  );

  const reminderLevel = useMemo(
    () => getTrialReminderLevel(trialStartedAt),
    [trialStartedAt]
  );

  useEffect(() => {
    if (subscriptionSource !== 'trial' || reminderLevel !== 'modal') return;
    if (wasTrialReminderModalShownThisSession()) return;
    setModalVisible(true);
    markTrialReminderModalShown();
  }, [subscriptionSource, reminderLevel]);

  const handleUpgrade = useCallback(() => {
    setModalVisible(false);
    router.push('/paywall' as never);
  }, [router]);

  const handleDismissModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const showBanner =
    subscriptionSource === 'trial' &&
    reminderLevel === 'banner' &&
    trialStatus.active &&
    !bannerDismissed;

  return (
    <>
      {children}
      {showBanner ? (
        <View style={[styles.bannerWrap, { top: insets.top }]} pointerEvents="box-none">
          <Pressable
            style={styles.banner}
            onPress={() => router.push('/paywall' as never)}
            accessibilityRole="button"
            accessibilityLabel={trialBannerMessage(trialStatus.daysRemaining)}>
            <Text style={styles.bannerText}>
              {trialBannerMessage(trialStatus.daysRemaining)}
            </Text>
            <Text style={styles.bannerCta}>Upgrade</Text>
          </Pressable>
          <Pressable
            style={styles.bannerDismiss}
            onPress={() => setBannerDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss trial reminder">
            <Text style={styles.bannerDismissText}>×</Text>
          </Pressable>
        </View>
      ) : null}
      <UpgradePromptModal
        visible={modalVisible}
        featureName={trialModalHeadline(trialStatus.daysRemaining)}
        onUpgrade={handleUpgrade}
        onDismiss={handleDismissModal}
      />
    </>
  );
}

export function TrialBadge() {
  const subscriptionSource = useSubscriptionStore((s) => s.subscriptionSource);
  const trialStartedAt = useSubscriptionStore((s) => s.trialStartedAt);

  const trialStatus = useMemo(
    () => computeTrialStatus(trialStartedAt),
    [trialStartedAt]
  );

  if (subscriptionSource !== 'trial' || !trialStatus.active) {
    return null;
  }

  const dayWord = trialStatus.daysRemaining === 1 ? 'day' : 'days';

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        Pro trial — {trialStatus.daysRemaining} {dayWord} left
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  banner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.text,
  },
  bannerCta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22C55E',
    marginLeft: 8,
  },
  bannerDismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerDismissText: {
    fontSize: 20,
    lineHeight: 22,
    color: SmartCartColors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
});

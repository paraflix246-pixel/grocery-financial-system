import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBudgetStore } from '@/src/store/useBudgetStore';
import { ProPlanFeaturesList } from '@/src/components/ProPlanFeaturesList';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';
import {
  COMMIT_NOTE,
  CONTINUE_FREE_LABEL,
  ONBOARDING_UPGRADE_HEADLINE,
  PAYWALL_SUBHEAD,
  PRO_BADGE_LABEL,
  PRO_CTA_LABEL,
  PRO_CTA_SUBTEXT,
  PRO_PLAN_LEAD,
  proMonthlyLabel,
} from '@/src/constants/proPricing';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.52)';
const CARD_BG = 'rgba(255,255,255,0.05)';

export default function UpgradeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);
  const [upgrading, setUpgrading] = useState(false);

  async function handleStartFree() {
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  async function handleUpgradePro() {
    setUpgrading(true);
    try {
      await completeOnboarding();
      router.replace('/paywall' as never);
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getScreenBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💰</Text>
          <Text style={styles.heroTitle}>{ONBOARDING_UPGRADE_HEADLINE}</Text>
          <Text style={styles.heroSubtitle}>{PAYWALL_SUBHEAD}</Text>
        </View>

        <View style={styles.proCard}>
          <Text style={styles.proBadgeText}>
            Pro — {proMonthlyLabel} · {PRO_BADGE_LABEL}
          </Text>
          <ProPlanFeaturesList
            variant="full"
            leadLabel={PRO_PLAN_LEAD}
            accentColor={GREEN}
            mutedColor={TEXT_MUTED}
            featureTextStyle={styles.benefitText}
            leadTextStyle={styles.benefitText}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.upgradeBtn, pressed && styles.upgradeBtnPressed]}
          onPress={handleUpgradePro}
          disabled={upgrading}
          accessibilityRole="button"
          accessibilityLabel={PRO_CTA_LABEL}
        >
          <Text style={styles.upgradeBtnText}>
            {upgrading ? 'Loading...' : `${PRO_CTA_LABEL} — ${proMonthlyLabel}`}
          </Text>
        </Pressable>

        <Text style={styles.ctaSubtext}>{PRO_CTA_SUBTEXT}</Text>
        <Text style={styles.commitNote}>{COMMIT_NOTE}</Text>

        <Pressable
          style={({ pressed }) => [styles.freeBtn, pressed && styles.freeBtnPressed]}
          onPress={handleStartFree}
          accessibilityRole="button"
          accessibilityLabel={CONTINUE_FREE_LABEL}
        >
          <Text style={styles.freeBtnText}>{CONTINUE_FREE_LABEL}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  heroTitle: {
    color: TEXT_PRIMARY,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
  },
  proCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    marginBottom: 28,
  },
  proBadgeText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  benefitText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  upgradeBtnPressed: {
    opacity: 0.82,
  },
  upgradeBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  ctaSubtext: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  commitNote: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  freeBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  freeBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
});

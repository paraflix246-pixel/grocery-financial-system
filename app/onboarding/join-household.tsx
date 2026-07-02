import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JoinFamilyCodeForm } from '@/src/components/family/JoinFamilyCodeForm';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { markJoinHouseholdStepCompleted } from '@/src/services/onboardingFlowState';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { OnboardingColors } from '@/src/theme/onboardingTheme';
import { navigateToOnboardingWelcome } from '@/src/utils/onboardingWelcomeNavigation';

export default function JoinHouseholdScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);
  const { from } = useLocalSearchParams<{ from?: string }>();

  const isPaywallFallback = from === 'paywall-free';

  async function finishToHome() {
    await completeOnboarding();
    router.replace('/(tabs)' as Href);
  }

  function handleSkip() {
    markJoinHouseholdStepCompleted();
    if (isPaywallFallback) {
      void finishToHome();
      return;
    }
    router.push('/onboarding/upgrade');
  }

  function handleJoined() {
    markJoinHouseholdStepCompleted();
    if (isPaywallFallback) {
      void finishToHome();
      return;
    }
    router.push('/onboarding/upgrade');
  }

  function handleSignInRequired() {
    router.push('/onboarding/signin');
  }

  function handleLogoHome() {
    void navigateToOnboardingWelcome(router);
  }

  const heading = isPaywallFallback
    ? t('familyJoin.fallbackHeading')
    : t('familyJoin.onboardingHeading');
  const subheading = isPaywallFallback
    ? t('familyJoin.fallbackSubheading')
    : t('familyJoin.onboardingSubheading');
  const skipLabel = isPaywallFallback ? t('familyJoin.fallbackSkip') : t('familyJoin.skip');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={OnboardingColors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PennyPantryLogo
          variant="hero"
          size={56}
          style={styles.logo}
          onPress={handleLogoHome}
          accessibilityLabel={t('onboarding.flow.logoHomeA11y')}
        />

        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subheading}>{subheading}</Text>

        <JoinFamilyCodeForm
          variant="onboarding"
          onJoined={handleJoined}
          onSignInRequired={handleSignInRequired}
        />

        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
        >
          <Text style={styles.skipBtnText}>{skipLabel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logo: {
    marginBottom: 8,
  },
  heading: {
    color: OnboardingColors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    marginBottom: 28,
    lineHeight: 24,
  },
  skipBtn: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipBtnPressed: {
    opacity: 0.7,
  },
  skipBtnText: {
    color: OnboardingColors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
});

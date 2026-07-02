import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingFlowShell } from '@/src/components/onboarding/OnboardingFlowShell';
import { OnboardingSubscriptionScreen } from '@/src/components/onboarding/OnboardingSubscriptionScreen';
import { AnalyzingStep } from '@/src/components/onboarding/steps/AnalyzingStep';
import { AutomationPreviewStep } from '@/src/components/onboarding/steps/AutomationPreviewStep';
import { GoalsStep } from '@/src/components/onboarding/steps/GoalsStep';
import { TryProductStep } from '@/src/components/onboarding/steps/TryProductStep';
import { ValueMomentStep } from '@/src/components/onboarding/steps/ValueMomentStep';
import { WelcomeStep } from '@/src/components/onboarding/steps/WelcomeStep';
import { continueAsGuest } from '@/src/services/authService';
import {
  completeOnboardingTry,
  loadOnboardingProgress,
  markOnboardingTryStarted,
  resetOnboardingToWelcome,
  saveOnboardingProgress,
  setOnboardingStep,
  skipOnboardingTryWithoutData,
  toggleOnboardingGoal,
  type OnboardingFirstAction,
  type OnboardingGoal,
  type OnboardingProgress,
  type OnboardingStep,
} from '@/src/services/onboardingFlowState';
import {
  getPreviousOnboardingStep,
  resolveOnboardingStepOnLoad,
  shouldRenderAnalyzingStep,
} from '@/src/services/onboardingStepRouting';

export default function OnboardingFlowScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [tryBusy, setTryBusy] = useState(false);

  const refreshProgress = useCallback(async () => {
    const loaded = await loadOnboardingProgress();
    const resolvedStep = resolveOnboardingStepOnLoad(loaded.step, loaded);
    if (resolvedStep !== loaded.step) {
      const corrected = await setOnboardingStep(resolvedStep);
      setProgress(corrected);
      setReady(true);
      return corrected;
    }
    setProgress(loaded);
    setReady(true);
    return loaded;
  }, []);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  useFocusEffect(
    useCallback(() => {
      void refreshProgress().then((loaded) => {
        if (loaded.tryInProgress && loaded.firstAction) {
          void completeOnboardingTry().then(setProgress);
        }
      });
    }, [refreshProgress])
  );

  const goToStep = useCallback(async (step: OnboardingStep) => {
    const next = await setOnboardingStep(step);
    setProgress(next);
  }, []);

  const handleLogoHome = useCallback(async () => {
    const next = await resetOnboardingToWelcome();
    setProgress(next);
  }, []);

  const handleToggleGoal = useCallback(async (goal: OnboardingGoal) => {
    const next = await toggleOnboardingGoal(goal);
    setProgress(next);
  }, []);

  const ensureGuestIfNeeded = useCallback(async () => {
    await continueAsGuest();
  }, []);

  const handleTryAction = useCallback(
    async (action: OnboardingFirstAction) => {
      setTryBusy(true);
      try {
        await ensureGuestIfNeeded();
        await markOnboardingTryStarted(action);

        if (action === 'scan_receipt') {
          router.push('/(tabs)/scan?onboarding=1' as Href);
          return;
        }
        router.push('/pantry?onboarding=1' as Href);
      } finally {
        setTryBusy(false);
      }
    },
    [ensureGuestIfNeeded, router]
  );

  const handleSkipTry = useCallback(async () => {
    const next = await skipOnboardingTryWithoutData();
    setProgress(next);
  }, []);

  const handleSkipGoals = useCallback(async () => {
    await saveOnboardingProgress({ goals: ['save_money'], step: 3 });
    setProgress(await loadOnboardingProgress());
  }, []);

  if (!ready || !progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const step = progress.step;
  const showAnalyzing = step === 4 && shouldRenderAnalyzingStep(progress);
  const previousStep = getPreviousOnboardingStep(step, progress);

  if (step === 7) {
    return (
      <OnboardingFlowShell
        step={7}
        dark
        fullBleed
        onBack={() => void goToStep(6)}
      >
        <OnboardingSubscriptionScreen embedded onLogoPress={() => void handleLogoHome()} />
      </OnboardingFlowShell>
    );
  }

  return (
    <OnboardingFlowShell
      step={step}
      onBack={previousStep != null ? () => void goToStep(previousStep) : undefined}
      onSkip={
        step === 2
          ? () => void handleSkipGoals()
          : step === 3
            ? () => void handleSkipTry()
            : undefined
      }
      skipLabel={step === 3 ? t('onboarding.flow.try.skip') : undefined}
    >
      {step === 1 ? (
        <WelcomeStep
          onGetStarted={() => void goToStep(2)}
          onSignIn={() => router.push('/onboarding/signin')}
          onLogoPress={() => void handleLogoHome()}
          logoAccessibilityLabel={t('onboarding.flow.logoHomeA11y')}
        />
      ) : null}

      {step === 2 ? (
        <GoalsStep
          selectedGoals={progress.goals}
          onToggleGoal={(goal) => void handleToggleGoal(goal)}
          onContinue={() => void goToStep(3)}
        />
      ) : null}

      {step === 3 ? (
        <TryProductStep
          busy={tryBusy}
          onSelect={(action) => void handleTryAction(action)}
          onSkip={() => void handleSkipTry()}
        />
      ) : null}

      {showAnalyzing ? (
        <AnalyzingStep onComplete={() => void goToStep(5)} />
      ) : null}

      {step === 5 ? (
        <ValueMomentStep
          goals={progress.goals}
          skippedTryWithoutData={progress.skippedTryWithoutData}
          onContinue={() => void goToStep(6)}
        />
      ) : null}

      {step === 6 ? (
        <AutomationPreviewStep onContinue={() => void goToStep(7)} />
      ) : null}
    </OnboardingFlowShell>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

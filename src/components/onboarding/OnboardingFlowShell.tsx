import type { ReactNode } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguagePicker } from '@/src/components/settings/AppearanceSettings';
import { PremiumScreenBackground } from '@/src/components/PremiumScreenBackground';
import { ONBOARDING_STEP_COUNT, type OnboardingStep } from '@/src/services/onboardingFlowState';
import { OnboardingColors } from '@/src/theme/onboardingTheme';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

type Props = {
  step: OnboardingStep;
  children: ReactNode;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  footer?: ReactNode;
  dark?: boolean;
  fullBleed?: boolean;
};

export function OnboardingFlowShell({
  step,
  children,
  onBack,
  onSkip,
  skipLabel,
  footer,
  dark = false,
  fullBleed = false,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const progress = step / ONBOARDING_STEP_COUNT;

  const content = (
    <>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.flow.backA11y')}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              tintColor={dark ? '#FFFFFF' : OnboardingColors.text}
              size={20}
            />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <View
          style={[styles.progressTrack, dark && styles.progressTrackDark]}
          accessibilityRole="progressbar"
        >
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        {onSkip ? (
          <Pressable
            onPress={onSkip}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel={skipLabel ?? t('common.skip')}
          >
            <Text style={[styles.skipText, dark && styles.skipTextDark]}>
              {skipLabel ?? t('common.skip')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.langSlot}>
            <LanguagePicker compact />
          </View>
        )}
      </View>

      <View style={[styles.body, fullBleed && styles.bodyFullBleed]}>{children}</View>

      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: getScreenBottomPadding(insets.bottom, 16) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  if (dark) {
    return <View style={styles.darkRoot}>{content}</View>;
  }

  return (
    <PremiumScreenBackground style={styles.lightRoot}>{content}</PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  lightRoot: { flex: 1 },
  darkRoot: { flex: 1, backgroundColor: '#0F0F0F' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { width: 40 },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressTrackDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: OnboardingColors.green,
  },
  skipBtn: { minWidth: 56, alignItems: 'flex-end', paddingVertical: 8 },
  skipText: {
    color: OnboardingColors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  skipTextDark: { color: 'rgba(255,255,255,0.55)' },
  langSlot: { minWidth: 96, alignItems: 'flex-end' },
  body: {
    flex: 1,
    paddingHorizontal: 24,
  },
  bodyFullBleed: {
    paddingHorizontal: 0,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});

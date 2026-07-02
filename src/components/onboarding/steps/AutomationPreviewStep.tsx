import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import {
  OnboardingColors,
  OnboardingPrimaryCta,
  OnboardingPrimaryCtaText,
} from '@/src/theme/onboardingTheme';

const FEATURE_KEYS = [
  'onboarding.flow.automation.expiryAlerts',
  'onboarding.flow.automation.duplicateCatch',
  'onboarding.flow.automation.leakTracking',
  'onboarding.flow.automation.sharedLists',
  'onboarding.flow.automation.reminders',
] as const;

type Props = {
  onContinue: () => void;
};

export function AutomationPreviewStep({ onContinue }: Props) {
  const { t } = useTranslation();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.flow.automation.title')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.flow.automation.subtitle')}</Text>

      <View style={styles.card}>
        {FEATURE_KEYS.map((key) => (
          <View key={key} style={styles.row}>
            <SymbolView
              name={{ ios: 'bell.badge.fill', android: 'notifications', web: 'notifications' }}
              tintColor={OnboardingColors.green}
              size={18}
            />
            <Text style={styles.rowText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>{t('onboarding.flow.automation.note')}</Text>

      <Pressable
        style={({ pressed }) => [OnboardingPrimaryCta, pressed && styles.pressed]}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.flow.automation.continue')}
      >
        <Text style={OnboardingPrimaryCtaText}>{t('onboarding.flow.automation.continue')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 24, gap: 14 },
  title: {
    color: OnboardingColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  subtitle: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: OnboardingColors.text,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: OnboardingColors.textMuted,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: { opacity: 0.9 },
});

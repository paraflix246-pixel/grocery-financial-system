import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import type { OnboardingFirstAction } from '@/src/services/onboardingFlowState';
import { OnboardingColors } from '@/src/theme/onboardingTheme';

type ActionOption = {
  key: OnboardingFirstAction;
  icon: { ios: string; android: string; web: string };
};

const ACTIONS: ActionOption[] = [
  {
    key: 'scan_receipt',
    icon: { ios: 'doc.text.viewfinder', android: 'document_scanner', web: 'document_scanner' },
  },
  {
    key: 'add_manual',
    icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
  },
];

type Props = {
  busy: boolean;
  onSelect: (action: OnboardingFirstAction) => void;
  onSkip: () => void;
};

export function TryProductStep({ busy, onSelect, onSkip }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.flow.try.title')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.flow.try.subtitle')}</Text>
      <Text style={styles.note}>{t('onboarding.flow.try.noAccount')}</Text>

      <View style={styles.actions}>
        {ACTIONS.map(({ key, icon }) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.actionCard, pressed && !busy && styles.pressed]}
            onPress={() => onSelect(key)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t(`onboarding.flow.try.${key}`)}
          >
            <View style={styles.iconWrap}>
              <SymbolView name={icon as never} tintColor={OnboardingColors.greenDark} size={28} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.actionTitle}>{t(`onboarding.flow.try.${key}`)}</Text>
              <Text style={styles.actionBody}>{t(`onboarding.flow.try.${key}Body`)}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={OnboardingColors.textMuted}
              size={18}
            />
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.skipBtn, pressed && !busy && styles.pressed]}
        onPress={onSkip}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.flow.try.skipStep')}
      >
        <Text style={styles.skipBtnText}>{t('onboarding.flow.try.skipStep')}</Text>
      </Pressable>

      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={OnboardingColors.green} />
          <Text style={styles.busyText}>{t('onboarding.flow.try.opening')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 16, gap: 12 },
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
  note: {
    color: OnboardingColors.greenDark,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actions: { gap: 12 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    backgroundColor: '#FFFFFF',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingColors.text,
  },
  actionBody: {
    fontSize: 13,
    color: OnboardingColors.textMuted,
    lineHeight: 18,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  busyText: { color: OnboardingColors.textMuted, fontSize: 14, fontWeight: '600' },
  skipBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 4,
  },
  skipBtnText: {
    color: OnboardingColors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: { opacity: 0.9 },
});

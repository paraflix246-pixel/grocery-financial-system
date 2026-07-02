import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import type { OnboardingGoal } from '@/src/services/onboardingFlowState';
import {
  OnboardingColors,
  OnboardingPrimaryCta,
  OnboardingPrimaryCtaText,
} from '@/src/theme/onboardingTheme';

const GOAL_OPTIONS: Array<{
  key: OnboardingGoal;
  icon: { ios: string; android: string; web: string };
}> = [
  {
    key: 'save_money',
    icon: { ios: 'dollarsign.circle.fill', android: 'savings', web: 'savings' },
  },
  {
    key: 'reduce_waste',
    icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  },
  {
    key: 'organize_pantry',
    icon: { ios: 'cabinet.fill', android: 'kitchen', web: 'kitchen' },
  },
  {
    key: 'feed_family',
    icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  },
];

type Props = {
  selectedGoals: OnboardingGoal[];
  onToggleGoal: (goal: OnboardingGoal) => void;
  onContinue: () => void;
};

export function GoalsStep({ selectedGoals, onToggleGoal, onContinue }: Props) {
  const { t } = useTranslation();
  const canContinue = selectedGoals.length > 0;

  return (
    <View style={styles.root}>
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.flow.goals.title')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.flow.goals.subtitle')}</Text>

      <View style={styles.options}>
        {GOAL_OPTIONS.map(({ key, icon }) => {
          const selected = selectedGoals.includes(key);
          return (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
              onPress={() => onToggleGoal(key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t(`onboarding.flow.goals.${key}`)}
            >
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                <SymbolView
                  name={icon as never}
                  tintColor={selected ? OnboardingColors.greenDark : OnboardingColors.textMuted}
                  size={22}
                />
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {t(`onboarding.flow.goals.${key}`)}
              </Text>
              {selected ? (
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                  tintColor={OnboardingColors.green}
                  size={22}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [
          OnboardingPrimaryCta,
          !canContinue && styles.disabled,
          pressed && canContinue && styles.pressed,
        ]}
        onPress={onContinue}
        disabled={!canContinue}
        accessibilityRole="button"
        accessibilityLabel={t('common.continue')}
      >
        <Text style={OnboardingPrimaryCtaText}>{t('common.continue')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 16, gap: 16 },
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
    marginBottom: 4,
  },
  options: { flex: 1, gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: OnboardingColors.green,
    backgroundColor: '#F0FDF4',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: '#DCFCE7' },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: OnboardingColors.text,
  },
  optionTextSelected: { color: OnboardingColors.greenDark },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9 },
});

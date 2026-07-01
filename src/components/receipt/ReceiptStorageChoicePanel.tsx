import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Themed';
import type { ReceiptStorageSessionChoice } from '@/src/services/privacyPreferencesService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  choice: ReceiptStorageSessionChoice | null;
  onChoiceChange: (choice: ReceiptStorageSessionChoice) => void;
  rememberChoice: boolean;
  onRememberChange: (remember: boolean) => void;
  showRemember?: boolean;
};

export function ReceiptStorageChoicePanel({
  choice,
  onChoiceChange,
  rememberChoice,
  onRememberChange,
  showRemember = true,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('privacy.receiptStorage.title')}</Text>
      <Text style={styles.subtitle}>{t('privacy.receiptStorage.subtitle')}</Text>

      <Pressable
        style={[styles.option, choice === 'image_and_data' && styles.optionSelected]}
        onPress={() => onChoiceChange('image_and_data')}
        accessibilityRole="radio"
        accessibilityState={{ selected: choice === 'image_and_data' }}
      >
        <SymbolView
          name={{
            ios: choice === 'image_and_data' ? 'largecircle.fill.circle' : 'circle',
            android: choice === 'image_and_data' ? 'radio_button_checked' : 'radio_button_unchecked',
            web: choice === 'image_and_data' ? 'radio_button_checked' : 'radio_button_unchecked',
          }}
          tintColor={choice === 'image_and_data' ? SmartCartColors.primary : SmartCartColors.textMuted}
          size={22}
        />
        <View style={styles.optionText}>
          <Text style={styles.optionLabel}>{t('privacy.receiptStorage.imageAndData')}</Text>
          <Text style={styles.optionHint}>{t('privacy.receiptStorage.imageAndDataHint')}</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.option, choice === 'data_only' && styles.optionSelected]}
        onPress={() => onChoiceChange('data_only')}
        accessibilityRole="radio"
        accessibilityState={{ selected: choice === 'data_only' }}
      >
        <SymbolView
          name={{
            ios: choice === 'data_only' ? 'largecircle.fill.circle' : 'circle',
            android: choice === 'data_only' ? 'radio_button_checked' : 'radio_button_unchecked',
            web: choice === 'data_only' ? 'radio_button_checked' : 'radio_button_unchecked',
          }}
          tintColor={choice === 'data_only' ? SmartCartColors.primary : SmartCartColors.textMuted}
          size={22}
        />
        <View style={styles.optionText}>
          <Text style={styles.optionLabel}>{t('privacy.receiptStorage.dataOnly')}</Text>
          <Text style={styles.optionHint}>{t('privacy.receiptStorage.dataOnlyHint')}</Text>
        </View>
      </Pressable>

      {showRemember ? (
        <Pressable
          style={styles.rememberRow}
          onPress={() => onRememberChange(!rememberChoice)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberChoice }}
        >
          <SymbolView
            name={{
              ios: rememberChoice ? 'checkmark.square.fill' : 'square',
              android: rememberChoice ? 'check_box' : 'check_box_outline_blank',
              web: rememberChoice ? 'check_box' : 'check_box_outline_blank',
            }}
            tintColor={rememberChoice ? SmartCartColors.primary : SmartCartColors.textMuted}
            size={22}
          />
          <Text style={styles.rememberText}>{t('privacy.receiptStorage.remember')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function useReceiptStorageValidation() {
  const { t } = useTranslation();

  return useCallback(
    (choice: ReceiptStorageSessionChoice | null): string | null => {
      if (!choice) return t('privacy.receiptStorage.required');
      return null;
    },
    [t]
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
  },
  optionSelected: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.primaryMuted,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: SmartCartColors.text,
  },
  optionHint: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    lineHeight: 17,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  rememberText: {
    flex: 1,
    fontSize: 14,
    color: SmartCartColors.textSecondary,
  },
});

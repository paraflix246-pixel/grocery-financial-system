import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  resolveJoinSuccessMessageKey,
  type JoinFamilyWorkspaceErrorCode,
  type JoinFamilyWorkspaceSuccess,
} from '@/src/services/joinFamilyWorkspaceLogic';
import { joinFamilyWorkspaceFromInput } from '@/src/services/joinFamilyWorkspaceService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { OnboardingColors, OnboardingPrimaryCta, OnboardingPrimaryCtaText } from '@/src/theme/onboardingTheme';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type JoinFamilyCodeFormProps = {
  variant: 'onboarding' | 'settings';
  onJoined?: (result: JoinFamilyWorkspaceSuccess) => void;
  onSignInRequired?: () => void;
  disabled?: boolean;
};

function errorKey(code: JoinFamilyWorkspaceErrorCode): string {
  switch (code) {
    case 'INVALID_INPUT':
    case 'INVALID_CODE':
      return 'familyJoin.errors.invalidCode';
    case 'NOT_SIGNED_IN':
      return 'familyJoin.errors.notSignedIn';
    case 'NOT_FOUND':
      return 'familyJoin.errors.notFound';
    case 'ALREADY_OWNER':
      return 'familyJoin.errors.alreadyOwner';
    default:
      return 'familyJoin.errors.generic';
  }
}

export function JoinFamilyCodeForm({
  variant,
  onJoined,
  onSignInRequired,
  disabled = false,
}: JoinFamilyCodeFormProps) {
  const { t } = useTranslation();
  const setActiveScope = useWorkspaceStore((s) => s.setActiveScope);
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const isOnboarding = variant === 'onboarding';
  const colors = isOnboarding
    ? {
        text: OnboardingColors.text,
        muted: OnboardingColors.textMuted,
        border: OnboardingColors.border,
        card: OnboardingColors.card,
        accent: OnboardingColors.green,
        errorBg: '#FEF2F2',
        errorBorder: 'rgba(239,68,68,0.25)',
        errorText: '#DC2626',
        successBg: '#F0FDF4',
        successBorder: 'rgba(34,197,94,0.25)',
        successText: '#15803D',
      }
    : {
        text: SmartCartColors.text,
        muted: SmartCartColors.textSecondary,
        border: SmartCartColors.border,
        card: SmartCartColors.background,
        accent: SmartCartColors.primary,
        errorBg: '#FEF2F2',
        errorBorder: 'rgba(239,68,68,0.25)',
        errorText: '#DC2626',
        successBg: '#F0FDF4',
        successBorder: 'rgba(34,197,94,0.25)',
        successText: '#15803D',
      };

  const handleJoin = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await joinFamilyWorkspaceFromInput(codeInput);
      if (!result.ok) {
        if (result.code === 'NOT_SIGNED_IN') {
          onSignInRequired?.();
        }
        setError(t(errorKey(result.code)));
        return;
      }

      const messageKey = resolveJoinSuccessMessageKey(result.data);
      setSuccess(t(messageKey, { name: result.data.workspaceName, code: result.data.code }));
      setCodeInput('');
      onJoined?.(result.data);

      if (result.data.subscriptionActive) {
        await setActiveScope('workspace');
      }
    } finally {
      setLoading(false);
    }
  }, [codeInput, onJoined, onSignInRequired, setActiveScope, t]);

  return (
    <View style={styles.root}>
      <Text style={[styles.hint, { color: colors.muted }]}>{t('familyJoin.hint')}</Text>

      {error ? (
        <View style={[styles.feedbackBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
          <Text style={[styles.feedbackText, { color: colors.errorText }]}>{error}</Text>
          {error === t('familyJoin.errors.notSignedIn') && onSignInRequired ? (
            <Pressable onPress={onSignInRequired} accessibilityRole="button">
              <Text style={[styles.linkText, { color: colors.accent }]}>{t('familyJoin.signInCta')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {success ? (
        <View style={[styles.feedbackBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
          <Text style={[styles.feedbackText, { color: colors.successText }]}>{success}</Text>
        </View>
      ) : null}

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.accent : colors.border,
            color: colors.text,
          },
        ]}
        value={codeInput}
        onChangeText={setCodeInput}
        placeholder={t('familyJoin.placeholder')}
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading && !disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => void handleJoin()}
        returnKeyType="done"
        selectionColor={colors.accent}
        accessibilityLabel={t('familyJoin.placeholder')}
      />

      <Pressable
        style={({ pressed }) => [
          isOnboarding ? (styles.ctaBtn as ViewStyle) : styles.settingsBtn,
          isOnboarding && (styles.ctaBtnOnboarding as ViewStyle),
          (loading || !codeInput.trim() || disabled) && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={() => void handleJoin()}
        disabled={loading || !codeInput.trim() || disabled}
        accessibilityRole="button"
        accessibilityLabel={t('familyJoin.submit')}
      >
        {loading ? (
          <ActivityIndicator color={isOnboarding ? '#FFFFFF' : SmartCartColors.primary} />
        ) : (
          <Text
            style={
              isOnboarding
                ? (styles.ctaBtnText as TextStyle)
                : [styles.settingsBtnText, { color: SmartCartColors.primary }]
            }>
            {t('familyJoin.submit')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  hint: { fontSize: 13, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  feedbackBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  feedbackText: { fontSize: 14, lineHeight: 20 },
  linkText: { fontSize: 14, fontWeight: '700' },
  ctaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaBtnOnboarding: {
    ...OnboardingPrimaryCta,
  },
  ctaBtnText: {
    ...OnboardingPrimaryCtaText,
  },
  settingsBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
    alignItems: 'center',
  },
  settingsBtnText: { fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.88 },
});

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import type { AppThemeId, AppThemeTokens } from '@/src/theme/appThemes';
import { setAppLocale, type AppLocale } from '@/src/i18n';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  compact?: boolean;
};

export function LanguagePicker({ compact = false }: Props) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'es' ? 'es' : 'en';

  const setLocale = (next: AppLocale) => {
    if (next !== locale) {
      void setAppLocale(next);
    }
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]} accessibilityRole="radiogroup" accessibilityLabel={t('common.language')}>
      {(['en', 'es'] as const).map((code) => {
        const active = locale === code;
        return (
          <Pressable
            key={code}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setLocale(code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={code === 'en' ? t('common.english') : t('common.spanish')}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {code === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ThemePicker() {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeId, setThemeId, themes } = useAppTheme();
  const { unlocked, requestAccess } = useFeatureGate('custom_themes');

  const handleSelect = (id: AppThemeId) => {
    if (!unlocked) {
      requestAccess();
      return;
    }
    void setThemeId(id);
  };

  return (
    <View style={styles.themeSection}>
      {!unlocked ? (
        <Pressable style={styles.lockedBanner} onPress={() => router.push('/paywall' as never)}>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor={SmartCartColors.primary}
            size={16}
          />
          <Text style={styles.lockedText}>{t('settings.themeLocked')}</Text>
          <Text style={styles.lockedLink}>{t('settings.themeLockedBtn')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.swatches}>
        {themes.map((preset) => (
          <ThemeSwatch
            key={preset.id}
            preset={preset}
            selected={themeId === preset.id}
            locked={!unlocked}
            onPress={() => handleSelect(preset.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ThemeSwatch({
  preset,
  selected,
  locked,
  onPress,
}: {
  preset: AppThemeTokens;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [bg, accent] = preset.swatch;

  return (
    <Pressable
      style={[styles.swatchCard, selected && styles.swatchCardSelected, locked && styles.swatchLocked]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t(preset.nameKey)}>
      <View style={[styles.swatchPreview, { backgroundColor: bg, borderColor: preset.border }]}>
        <View style={[styles.swatchAccent, { backgroundColor: accent }]} />
        {selected && !locked ? (
          <View style={[styles.checkBadge, { backgroundColor: accent }]}>
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              tintColor="#fff"
              size={12}
            />
          </View>
        ) : null}
        {locked ? (
          <View style={styles.lockOverlay}>
            <SymbolView
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              tintColor="rgba(255,255,255,0.9)"
              size={14}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.swatchName} numberOfLines={1}>
        {t(preset.nameKey)}
      </Text>
      <Text style={styles.swatchDesc} numberOfLines={2}>
        {t(preset.descriptionKey)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowCompact: {
    alignSelf: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1.5,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  chipActive: {
    borderColor: SmartCartColors.primary,
    backgroundColor: `${SmartCartColors.primary}18`,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
  },
  chipTextActive: {
    color: SmartCartColors.primary,
    fontWeight: '700',
  },
  themeSection: { gap: 12 },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: `${SmartCartColors.primary}12`,
    borderWidth: 1,
    borderColor: `${SmartCartColors.primary}33`,
  },
  lockedText: {
    flex: 1,
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    minWidth: 120,
  },
  lockedLink: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.primary,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatchCard: {
    width: '47%',
    minWidth: 140,
    flexGrow: 1,
    padding: 10,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1.5,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
  },
  swatchCardSelected: {
    borderColor: SmartCartColors.primary,
    backgroundColor: `${SmartCartColors.primary}0D`,
  },
  swatchLocked: {
    opacity: 0.72,
  },
  swatchPreview: {
    height: 52,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
  },
  swatchAccent: {
    width: 28,
    height: 8,
    borderRadius: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchName: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.text,
    marginBottom: 2,
  },
  swatchDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: SmartCartColors.textMuted,
  },
});

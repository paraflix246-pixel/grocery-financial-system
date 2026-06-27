import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { ThemePreviewMini } from '@/src/components/ThemePreviewMini';
import { AvatarBadge } from '@/src/components/avatars/AvatarBadge';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { useAppFont } from '@/src/theme/AppFontProvider';
import type { AppFontId, AppFontPreset } from '@/src/theme/appFonts';
import type { AppThemeId, AppThemeTokens } from '@/src/theme/appThemes';
import type { AppAvatarId, AppAvatarPreset } from '@/src/components/avatars/appAvatars';
import { useAvatar } from '@/src/components/avatars/AvatarProvider';
import { setAppLocale, type AppLocale } from '@/src/i18n';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

const VISIBLE_FONT_COUNT = 3;
const VISIBLE_AVATAR_COUNT = 4;

type AppearanceSectionResetProps = {
  visible: boolean;
  onPress: () => void;
};

export function AppearanceSectionReset({ visible, onPress }: AppearanceSectionResetProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.sectionResetRow, pressed && styles.sectionResetRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('settings.resetSection')}>
      <Text style={styles.sectionResetText}>{t('settings.resetSection')}</Text>
    </Pressable>
  );
}

type LanguagePickerProps = {
  compact?: boolean;
  locale?: AppLocale;
  onLocaleChange?: (locale: AppLocale) => void;
};

export function LanguagePicker({ compact = false, locale: controlledLocale, onLocaleChange }: LanguagePickerProps) {
  const { i18n, t } = useTranslation();
  const locale = controlledLocale ?? (i18n.language === 'es' ? 'es' : 'en');

  const setLocale = (next: AppLocale) => {
    if (next === locale) return;
    if (onLocaleChange) {
      onLocaleChange(next);
      return;
    }
    void setAppLocale(next);
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

type ThemePickerProps = {
  themeId?: AppThemeId;
  onThemeSelect?: (id: AppThemeId) => void;
};

export function ThemePicker({ themeId: controlledThemeId, onThemeSelect }: ThemePickerProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { themeId: contextThemeId, setThemeId, themes } = useAppTheme();
  const themeId = controlledThemeId ?? contextThemeId;
  const { unlocked, requestAccess } = useFeatureGate('custom_themes');

  const handleSelect = (id: AppThemeId) => {
    if (!unlocked) {
      requestAccess();
      return;
    }
    if (onThemeSelect) {
      onThemeSelect(id);
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
            compact={compact}
            onPress={() => handleSelect(preset.id)}
          />
        ))}
      </View>
    </View>
  );
}

type FontPickerProps = {
  fontId?: AppFontId;
  onFontSelect?: (id: AppFontId) => void;
};

export function FontPicker({ fontId: controlledFontId, onFontSelect }: FontPickerProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { fontId: contextFontId, setFontId, fonts } = useAppFont();
  const fontId = controlledFontId ?? contextFontId;
  const { unlocked, requestAccess } = useFeatureGate('custom_fonts');
  const visibleFonts = fonts.slice(0, VISIBLE_FONT_COUNT);
  const extraFonts = fonts.slice(VISIBLE_FONT_COUNT);
  const [expanded, setExpanded] = useState(() => extraFonts.some((f) => f.id === fontId));

  useEffect(() => {
    if (extraFonts.some((f) => f.id === fontId)) {
      setExpanded(true);
    }
  }, [fontId, extraFonts]);

  const handleSelect = (id: AppFontId) => {
    const preset = fonts.find((f) => f.id === id);
    if (preset?.isPro && !unlocked) {
      requestAccess();
      return;
    }
    if (onFontSelect) {
      onFontSelect(id);
      return;
    }
    void setFontId(id);
  };

  return (
    <View style={styles.themeSection} accessibilityRole="radiogroup" accessibilityLabel={t('settings.font')}>
      {!unlocked ? (
        <Pressable style={styles.lockedBanner} onPress={() => router.push('/paywall' as never)}>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor={SmartCartColors.primary}
            size={16}
          />
          <Text style={styles.lockedText}>{t('settings.fontLocked')}</Text>
          <Text style={styles.lockedLink}>{t('settings.themeLockedBtn')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.fontList}>
        {visibleFonts.map((preset) => (
          <FontOption
            key={preset.id}
            preset={preset}
            selected={fontId === preset.id}
            locked={preset.isPro && !unlocked}
            onPress={() => handleSelect(preset.id)}
            showProBadge={preset.isPro && !unlocked}
          />
        ))}
        {expanded
          ? extraFonts.map((preset) => (
              <FontOption
                key={preset.id}
                preset={preset}
                selected={fontId === preset.id}
                locked={preset.isPro && !unlocked}
                onPress={() => handleSelect(preset.id)}
                showProBadge={preset.isPro && !unlocked}
              />
            ))
          : null}
      </View>

      {extraFonts.length > 0 ? (
        <ShowMoreToggle
          expanded={expanded}
          label={expanded ? t('settings.showLess') : t('settings.showMoreFonts')}
          onPress={() => setExpanded((v) => !v)}
        />
      ) : null}
    </View>
  );
}

type AvatarPickerProps = {
  avatarId?: AppAvatarId;
  onAvatarSelect?: (id: AppAvatarId) => void;
};

export function AvatarPicker({ avatarId: controlledAvatarId, onAvatarSelect }: AvatarPickerProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { avatarId: contextAvatarId, setAvatarId, avatars } = useAvatar();
  const avatarId = controlledAvatarId ?? contextAvatarId;
  const { unlocked, requestAccess } = useFeatureGate('custom_avatars');
  const visibleAvatars = avatars.slice(0, VISIBLE_AVATAR_COUNT);
  const extraAvatars = avatars.slice(VISIBLE_AVATAR_COUNT);
  const [expanded, setExpanded] = useState(() => extraAvatars.some((a) => a.id === avatarId));

  useEffect(() => {
    if (extraAvatars.some((a) => a.id === avatarId)) {
      setExpanded(true);
    }
  }, [avatarId, extraAvatars]);

  const handleSelect = (id: AppAvatarId) => {
    if (!unlocked) {
      requestAccess();
      return;
    }
    if (onAvatarSelect) {
      onAvatarSelect(id);
      return;
    }
    void setAvatarId(id);
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
          <Text style={styles.lockedText}>{t('settings.avatarLocked')}</Text>
          <Text style={styles.lockedLink}>{t('settings.themeLockedBtn')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.avatarGrid}>
        {visibleAvatars.map((preset) => (
          <AvatarOption
            key={preset.id}
            preset={preset}
            selected={avatarId === preset.id}
            locked={!unlocked}
            onPress={() => handleSelect(preset.id)}
          />
        ))}
        {expanded
          ? extraAvatars.map((preset) => (
              <AvatarOption
                key={preset.id}
                preset={preset}
                selected={avatarId === preset.id}
                locked={!unlocked}
                onPress={() => handleSelect(preset.id)}
              />
            ))
          : null}
      </View>

      {extraAvatars.length > 0 ? (
        <ShowMoreToggle
          expanded={expanded}
          label={expanded ? t('settings.showLess') : t('settings.showMoreAvatars')}
          onPress={() => setExpanded((v) => !v)}
        />
      ) : null}
    </View>
  );
}

function ShowMoreToggle({
  expanded,
  label,
  onPress,
}: {
  expanded: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.showMoreRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={label}>
      <Text style={styles.showMoreText}>{label}</Text>
      <SymbolView
        name={{
          ios: expanded ? 'chevron.up' : 'chevron.down',
          android: expanded ? 'expand_less' : 'expand_more',
          web: expanded ? 'expand_less' : 'expand_more',
        }}
        tintColor={SmartCartColors.primary}
        size={14}
      />
    </Pressable>
  );
}

function FontOption({
  preset,
  selected,
  locked,
  onPress,
  showProBadge,
}: {
  preset: AppFontPreset;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
  showProBadge: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      style={[
        styles.fontCard,
        selected && !locked && [styles.fontCardSelected, { borderColor: SmartCartColors.primary }],
        locked && styles.swatchLocked,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      accessibilityLabel={
        locked ? `${t(preset.nameKey)} — ${t('settings.fontLocked')}` : t(preset.nameKey)
      }>
      <View style={styles.fontSampleWrap}>
        <Text
          style={[
            styles.fontSample,
            preset.fontFamily ? { fontFamily: preset.fontFamily } : undefined,
            selected && !locked && { color: SmartCartColors.primary },
          ]}
          numberOfLines={1}>
          {t(preset.sampleKey)}
        </Text>
        {locked ? (
          <View style={styles.fontLockOverlay}>
            <SymbolView
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              tintColor="rgba(255,255,255,0.92)"
              size={12}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.fontName} numberOfLines={1}>
        {t(preset.nameKey)}
        {showProBadge ? ` · Pro` : ''}
      </Text>
    </Pressable>
  );
}

function AvatarOption({
  preset,
  selected,
  locked,
  onPress,
}: {
  preset: AppAvatarPreset;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      style={[styles.avatarCell, selected && !locked && styles.avatarCellSelected, locked && styles.swatchLocked]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      accessibilityLabel={
        locked ? `${t(preset.nameKey)} — ${t('settings.avatarLocked')}` : t(preset.nameKey)
      }>
      <View style={styles.avatarBadgeWrap}>
        <AvatarBadge preset={preset} size="md" />
        {locked ? (
          <View style={styles.avatarLockOverlay}>
            <SymbolView
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              tintColor="rgba(255,255,255,0.92)"
              size={10}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.avatarName} numberOfLines={1}>
        {t(preset.nameKey)}
      </Text>
    </Pressable>
  );
}

function ThemeSwatch({
  preset,
  selected,
  locked,
  compact,
  onPress,
}: {
  preset: AppThemeTokens;
  selected: boolean;
  locked: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      style={[
        styles.swatchCard,
        compact && styles.swatchCardCompact,
        selected && [styles.swatchCardSelected, { borderColor: preset.primary, backgroundColor: `${preset.primary}0D` }],
        locked && styles.swatchLocked,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t(preset.nameKey)}>
      <View style={[styles.swatchPreviewWrap, compact && styles.swatchPreviewWrapCompact]}>
        <ThemePreviewMini preset={preset} selected={selected} />
        {selected && !locked ? (
          <View style={[styles.checkBadge, { backgroundColor: preset.primary }]}>
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
      <Text style={[styles.swatchDesc, compact && styles.swatchDescCompact]}>
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
  swatchCardCompact: {
    width: '48%',
    minWidth: 0,
    flexBasis: '48%',
    flexGrow: 0,
    padding: 8,
  },
  swatchCardSelected: {},
  swatchLocked: {
    opacity: 0.72,
  },
  swatchPreviewWrap: {
    height: 52,
    marginBottom: 8,
    position: 'relative',
  },
  swatchPreviewWrapCompact: {
    height: 44,
    marginBottom: 6,
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
  swatchDescCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  fontList: { gap: 8 },
  fontCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1.5,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
  },
  fontCardSelected: {
    backgroundColor: `${SmartCartColors.primary}0D`,
  },
  fontSampleWrap: {
    flex: 1,
    position: 'relative',
    minHeight: 22,
    justifyContent: 'center',
  },
  fontLockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: SmartCartRadius.sm - 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  fontSample: {
    fontSize: 16,
    fontWeight: '600',
    color: SmartCartColors.text,
  },
  fontName: {
    fontSize: 11,
    color: SmartCartColors.textMuted,
    maxWidth: 72,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarCell: {
    width: '22%',
    minWidth: 68,
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  avatarCellSelected: {
    borderColor: SmartCartColors.primary,
    backgroundColor: `${SmartCartColors.primary}0D`,
  },
  avatarName: {
    fontSize: 10,
    fontWeight: '600',
    color: SmartCartColors.textMuted,
    textAlign: 'center',
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.primary,
  },
  avatarBadgeWrap: {
    position: 'relative',
  },
  avatarLockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionResetRow: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  sectionResetRowPressed: {
    opacity: 0.7,
  },
  sectionResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: SmartCartColors.textMuted,
  },
});

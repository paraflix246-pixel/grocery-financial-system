import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import type { DataScope } from '@/src/models/workspace';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  scope: DataScope;
  workspaceName?: string | null;
  hasWorkspace: boolean;
  onScopeChange: (scope: DataScope) => void;
  onManageHousehold?: () => void;
  /** Show Family Workspace branding banner when household scope is active. */
  showBranding?: boolean;
};

export function WorkspaceScopeSwitcher({
  scope,
  workspaceName,
  hasWorkspace,
  onScopeChange,
  onManageHousehold,
  showBranding = false,
}: Props) {
  const { t } = useTranslation();

  if (!hasWorkspace) return null;

  const label = workspaceName?.trim() || t('workspace.defaultName');
  const isFamilyScope = scope === 'workspace';
  const family = FamilyWorkspaceTheme;

  return (
    <View style={styles.wrap}>
      {showBranding && isFamilyScope ? (
        <View
          style={[
            styles.familyBanner,
            { backgroundColor: family.bannerBg, borderColor: family.bannerBorder },
          ]}>
          <SymbolView
            name={{ ios: 'house.fill', android: 'home', web: 'home' }}
            tintColor={family.accent}
            size={16}
          />
          <View style={styles.familyBannerText}>
            <Text style={[styles.familyBannerTitle, { color: family.accent }]}>
              {t('workspace.familyWorkspace')}
            </Text>
            <Text style={styles.familyBannerSub} muted>
              {t('workspace.familyWorkspaceHint', { name: label })}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable
          style={[styles.chip, scope === 'personal' && styles.chipActive]}
          onPress={() => onScopeChange('personal')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'personal' }}
          accessibilityLabel={t('workspace.personalA11y')}>
          <SymbolView
            name={{ ios: 'person.fill', android: 'person', web: 'person' }}
            tintColor={scope === 'personal' ? SmartCartColors.primaryDark : SmartCartColors.textMuted}
            size={14}
          />
          <Text style={[styles.chipText, scope === 'personal' && styles.chipTextActive]}>
            {t('workspace.personal')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.chip,
            isFamilyScope && {
              borderColor: family.chipSelectedBorder,
              backgroundColor: family.chipSelectedBg,
            },
          ]}
          onPress={() => onScopeChange('workspace')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'workspace' }}
          accessibilityLabel={t('workspace.familyWorkspaceA11y', { name: label })}>
          <SymbolView
            name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
            tintColor={isFamilyScope ? family.accent : SmartCartColors.textMuted}
            size={14}
          />
          <Text
            style={[styles.chipText, isFamilyScope && { color: family.accentDark, fontWeight: '700' }]}>
            {t('workspace.familyWorkspaceShort')}
          </Text>
        </Pressable>
      </View>

      {onManageHousehold ? (
        <Pressable style={styles.manageBtn} onPress={onManageHousehold}>
          <SymbolView
            name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
            tintColor={isFamilyScope ? family.accent : SmartCartColors.textMuted}
            size={14}
          />
          <Text style={[styles.manageText, isFamilyScope && { color: family.accentDark }]}>
            {t('workspace.manageHousehold')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 12 },
  familyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
  },
  familyBannerText: { flex: 1, gap: 2 },
  familyBannerTitle: { fontSize: 13, fontWeight: '800' },
  familyBannerSub: { fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  chipActive: {
    borderColor: SmartCartColors.primary,
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textMuted },
  chipTextActive: { color: SmartCartColors.primaryDark },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  manageText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textMuted },
});

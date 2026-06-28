import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import type { DataScope } from '@/src/models/workspace';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  scope: DataScope;
  workspaceName?: string | null;
  workspaceAvailable: boolean;
  onChange: (scope: DataScope) => void;
};

export function DataScopePicker({
  scope,
  workspaceName,
  workspaceAvailable,
  onChange,
}: Props) {
  const { t } = useTranslation();

  if (!workspaceAvailable) return null;

  const householdLabel = workspaceName?.trim() ? workspaceName : t('workspace.defaultName');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('workspace.saveToLabel')}</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.option, scope === 'personal' && styles.optionActive]}
          onPress={() => onChange('personal')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'personal' }}>
          <SymbolView
            name={{ ios: 'person.fill', android: 'person', web: 'person' }}
            tintColor={scope === 'personal' ? SmartCartColors.primaryDark : SmartCartColors.textMuted}
            size={18}
          />
          <Text style={[styles.optionText, scope === 'personal' && styles.optionTextActive]}>
            {t('workspace.personal')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, scope === 'workspace' && styles.optionActiveWorkspace]}
          onPress={() => onChange('workspace')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'workspace' }}>
          <SymbolView
            name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
            tintColor={scope === 'workspace' ? '#16A34A' : SmartCartColors.textMuted}
            size={18}
          />
          <Text style={[styles.optionText, scope === 'workspace' && styles.optionTextWorkspace]}>
            {householdLabel}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{t('workspace.saveToHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  optionActive: {
    borderColor: SmartCartColors.primary,
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  optionActiveWorkspace: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: SmartCartColors.textMuted,
  },
  optionTextActive: {
    color: SmartCartColors.primaryDark,
  },
  optionTextWorkspace: {
    color: '#16A34A',
  },
  hint: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    lineHeight: 17,
  },
});

import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import type { DataScope } from '@/src/models/workspace';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  scope: DataScope;
  workspaceName?: string | null;
  hasWorkspace: boolean;
  onScopeChange: (scope: DataScope) => void;
  onManageHousehold?: () => void;
};

export function WorkspaceScopeSwitcher({
  scope,
  workspaceName,
  hasWorkspace,
  onScopeChange,
  onManageHousehold,
}: Props) {
  if (!hasWorkspace) return null;

  const label = workspaceName?.trim() || 'Household';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, scope === 'personal' && styles.chipActive]}
          onPress={() => onScopeChange('personal')}>
          <Text style={[styles.chipText, scope === 'personal' && styles.chipTextActive]}>Personal</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, scope === 'workspace' && styles.chipWorkspace]}
          onPress={() => onScopeChange('workspace')}>
          <Text style={[styles.chipText, scope === 'workspace' && styles.chipTextWorkspace]}>{label}</Text>
        </Pressable>
      </View>
      {onManageHousehold ? (
        <Pressable style={styles.manageBtn} onPress={onManageHousehold}>
          <SymbolView
            name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
            tintColor={SmartCartColors.textMuted}
            size={14}
          />
          <Text style={styles.manageText}>My household</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
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
  chipWorkspace: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textMuted },
  chipTextActive: { color: SmartCartColors.primaryDark },
  chipTextWorkspace: { color: '#16A34A' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  manageText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textMuted },
});

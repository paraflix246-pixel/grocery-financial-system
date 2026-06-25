import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import {
  SPENDING_PERIOD_OPTIONS,
  type SpendingPeriod,
} from '@/src/utils/spendingPeriodAnalytics';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const STORAGE_KEY = 'spending-analytics-period';

type Props = {
  period: SpendingPeriod;
  onPeriodChange: (period: SpendingPeriod) => void;
};

export function SpendingPeriodSelector({ period, onPeriodChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = SPENDING_PERIOD_OPTIONS.find((o) => o.id === period);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'day' || stored === 'week' || stored === 'month' || stored === 'year') {
          onPeriodChange(stored);
        }
      })
      .catch(() => {});
    // Load persisted preference once on mount.
  }, []);

  const handleSelect = (next: SpendingPeriod) => {
    onPeriodChange(next);
    setOpen(false);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <>
      <Pressable
        style={styles.periodPill}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select spending period">
        <Text style={styles.periodText}>{selected?.pillLabel ?? 'This Month'}</Text>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          tintColor={SmartCartColors.textSecondary}
          size={14}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {SPENDING_PERIOD_OPTIONS.map((option) => {
              const active = option.id === period;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.menuItem, active && styles.menuItemActive]}
                  onPress={() => handleSelect(option.id)}>
                  <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
                    {option.label}
                  </Text>
                  {active ? (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      tintColor={SmartCartColors.primary}
                      size={16}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    backgroundColor: SmartCartColors.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  periodText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: 16,
  },
  menu: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    minWidth: 160,
    overflow: 'hidden',
    ...SmartCartShadow.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemActive: { backgroundColor: SmartCartColors.primaryLight },
  menuItemText: { fontSize: 15, color: SmartCartColors.text, fontWeight: '500' },
  menuItemTextActive: { color: SmartCartColors.primary, fontWeight: '700' },
});

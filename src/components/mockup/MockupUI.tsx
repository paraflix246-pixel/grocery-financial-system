import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
export function MockupScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.screenTitle}>{title}</Text>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function MockupSearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchInputWrap}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          tintColor={SmartCartColors.textMuted}
          size={18}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={SmartCartColors.textMuted}
          style={styles.searchInput}
        />
      </View>
      <Pressable style={styles.filterBtn} accessibilityLabel="Filter">
        <SymbolView
          name={{ ios: 'line.3.horizontal.decrease.circle', android: 'filter_list', web: 'filter_list' }}
          tintColor={SmartCartColors.text}
          size={22}
        />
      </Pressable>
    </View>
  );
}

export function MockupFilterChips({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <HorizontalScrollRow contentContainerStyle={styles.chipRow}>
      {options.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable
            key={option.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option.id)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </HorizontalScrollRow>
  );
}

export function MockupTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.tabScroll}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onChange(tab.id)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MockupCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function MockupPrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: 'add' | 'chevron';
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed && !disabled && styles.primaryBtnPressed,
        disabled && styles.primaryBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}>
      {icon === 'add' ? (
        <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#fff" size={18} />
      ) : null}
      <Text style={styles.primaryBtnText}>{label}</Text>
      {icon === 'chevron' ? (
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} tintColor="#fff" size={16} />
      ) : null}
    </Pressable>
  );
}

export function MockupSectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  titleBlock: { marginBottom: 16 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.6 },
  screenSubtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SmartCartShadow.cardSoft,
  },
  searchInput: { flex: 1, fontSize: 15, color: SmartCartColors.text, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SmartCartShadow.cardSoft,
  },
  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  chipActive: { backgroundColor: SmartCartColors.primary, borderColor: SmartCartColors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  chipTextActive: { color: '#fff' },
  tabScroll: { marginBottom: 16, alignSelf: 'stretch' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: SmartCartRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: SmartCartColors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: SmartCartColors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 8,
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...SmartCartShadow.fab,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', flexShrink: 0 },
});

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { ComparisonSummary } from '@/src/components/ComparisonSummary';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StatusBanner } from '@/src/components/StatusBanner';
import { runMatchingAndSave } from '@/src/services/matchingService';
import { getReceiptById } from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import type { ComparisonResult } from '@/src/models/types';

export default function LinkListScreen() {
  const { t } = useTranslation();
  const { receiptId } = useLocalSearchParams<{ receiptId: string; fromSave?: string }>();
  const router = useRouter();
  const { lists, activeListId, loadLists } = useListStore();
  const resetScan = useScanStore((s) => s.reset);
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  useEffect(() => {
    loadLists();
    setSelectedListId(activeListId);
  }, [activeListId, loadLists]);

  const handleLink = async (listId: string) => {
    if (!receiptId) return;
    setLoading(true);
    try {
      const receipt = await getReceiptById(receiptId);
      if (!receipt?.items) return;
      const result = await runMatchingAndSave(receiptId, listId, receipt.items);
      setComparison(result);
      setSelectedListId(listId);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    resetScan();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: SmartCartColors.background }]}>
      <ScreenHeader title="Link to List" />
      <ScrollView contentContainerStyle={styles.content}>
        <StatusBanner message={t('receipt.savedSuccess')} emoji="✓" />
        <Pressable style={[styles.homeBtn, styles.homeBtnTop]} onPress={goHome} accessibilityRole="button">
          <SymbolView
            name={{ ios: 'house.fill', android: 'home', web: 'home' }}
            tintColor="#fff"
            size={18}
          />
          <Text style={styles.homeBtnText}>{t('receipt.goToHome')}</Text>
        </Pressable>
        <Text style={styles.subtitle}>
          Your receipt is saved. Tap a list to see what you planned vs what you bought.
        </Text>

        {lists.map((list) => (
          <Pressable
            key={list.id}
            style={[
              styles.listCard,
              selectedListId === list.id && styles.listCardActive,
              list.id === activeListId && styles.listCardSuggested,
            ]}
            onPress={() => handleLink(list.id)}
            disabled={loading}>
            <Text style={styles.listName}>{list.name}</Text>
            {list.id === activeListId && <Text style={styles.suggested}>Active list</Text>}
          </Pressable>
        ))}

        {loading && <ActivityIndicator style={{ marginVertical: 16 }} color={SmartCartColors.primary} />}

        {comparison && <ComparisonSummary comparison={comparison} />}

        {comparison ? (
          <View style={styles.actions}>
            <Pressable style={styles.doneBtn} onPress={goHome}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  subtitle: { color: SmartCartColors.textSecondary, marginBottom: 20, lineHeight: 20 },
  listCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  listCardActive: { borderColor: SmartCartColors.primaryDark, borderWidth: 2 },
  listCardSuggested: { backgroundColor: SmartCartColors.badgeGreen },
  listName: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  suggested: { color: SmartCartColors.primaryDark, fontSize: 12, marginTop: 4, fontWeight: '600' },
  actions: { marginTop: 24, gap: 12 },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.primary,
    padding: 16,
    borderRadius: SmartCartRadius.md,
  },
  homeBtnTop: { marginBottom: 16 },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  doneBtn: {
    backgroundColor: SmartCartColors.primaryDark,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

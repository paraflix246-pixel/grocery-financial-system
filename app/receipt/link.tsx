import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ComparisonSummary } from '@/src/components/ComparisonSummary';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { runMatchingAndSave } from '@/src/services/matchingService';
import { getReceiptById } from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors } from '@/src/theme/smartCart';
import type { ComparisonResult } from '@/src/models/types';

export default function LinkListScreen() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const handleSkip = () => {
    resetScan();
    router.replace('/(tabs)');
  };

  const handleDone = () => {
    resetScan();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: SmartCartColors.background }]}>
      <ScreenHeader title="Link to List" fallbackHref="/(tabs)/receipts" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Compare your receipt against a planned list to see plan vs actual.
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

        <View style={styles.actions}>
          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
          {comparison && (
            <Pressable style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
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
  skipBtn: { padding: 14, alignItems: 'center' },
  skipText: { color: SmartCartColors.textSecondary, fontWeight: '600' },
  doneBtn: {
    backgroundColor: SmartCartColors.primaryDark,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

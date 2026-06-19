import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { getListById, getListItems } from '@/src/services/storageService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency, sumPlannedTotal } from '@/src/utils/priceParser';

const FAMILY_KEY = '@smartcart_family_code';

export default function ListShareScreen() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState('');
  const [listName, setListName] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const buildSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const familyCode = (await AsyncStorage.getItem(FAMILY_KEY)) ?? 'SMARTCART';
      let targetId = listId;
      if (!targetId) {
        const { getActiveList } = await import('@/src/services/storageService');
        const active = await getActiveList();
        targetId = active?.id;
      }
      if (!targetId) {
        setSnapshot('');
        return;
      }
      const list = await getListById(targetId);
      const items = await getListItems(targetId);
      setListName(list?.name ?? 'Shopping list');
      setTotal(sumPlannedTotal(items));
      const payload = {
        version: 1,
        listName: list?.name,
        familyCode,
        exportedAt: new Date().toISOString(),
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          expectedPrice: i.expectedPrice,
          category: i.category,
        })),
      };
      setSnapshot(JSON.stringify(payload, null, 2));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    buildSnapshot();
  }, [buildSnapshot]);

  const handleShare = async () => {
    if (!snapshot) return;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(snapshot);
        Alert.alert('Copied', 'List snapshot copied to clipboard.');
      } else {
        await Share.share({ message: snapshot, title: `Share: ${listName}` });
      }
    } catch {
      Alert.alert('Share failed', 'Could not share the list snapshot.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Share List" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Generate a shareable snapshot of your list. Family members can import this JSON on their device.
        </Text>

        {!loading && listName ? (
          <View style={styles.summary}>
            <Text style={styles.listName}>{listName}</Text>
            <Text style={styles.listTotal}>Est. {formatCurrency(total)}</Text>
          </View>
        ) : null}

        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{loading ? 'Loading…' : snapshot || 'No list to share'}</Text>
        </View>

        <Pressable style={styles.shareBtn} onPress={handleShare} disabled={!snapshot}>
          <Text style={styles.shareBtnText}>
            {Platform.OS === 'web' ? 'Copy to clipboard' : 'Share snapshot'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 16 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listName: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  listTotal: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
  codeBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 20,
    ...SmartCartShadow.cardSoft,
  },
  codeText: { fontSize: 11, color: '#4ADE80', fontFamily: 'monospace', lineHeight: 16 },
  shareBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getAllLists, getListItems } from '@/src/services/storageService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const FAMILY_KEY = '@smartcart_family_code';

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function FamilyPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unlocked } = useFeatureGate('family_plans');
  const [familyCode, setFamilyCode] = useState('');
  const [importJson, setImportJson] = useState('');
  const [exportPreview, setExportPreview] = useState('');

  const loadCode = useCallback(async () => {
    const stored = await AsyncStorage.getItem(FAMILY_KEY);
    if (stored) setFamilyCode(stored);
    else {
      const code = generateShareCode();
      await AsyncStorage.setItem(FAMILY_KEY, code);
      setFamilyCode(code);
    }
  }, []);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleExportList = async () => {
    const lists = await getAllLists();
    const active = lists.find((l) => l.isActive) ?? lists[0];
    if (!active) {
      Alert.alert('No lists', 'Create a shopping list first.');
      return;
    }
    const items = await getListItems(active.id);
    const snapshot = {
      version: 1,
      listName: active.name,
      familyCode,
      exportedAt: new Date().toISOString(),
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        expectedPrice: i.expectedPrice,
        category: i.category,
      })),
    };
    const json = JSON.stringify(snapshot, null, 2);
    setExportPreview(json);
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(json);
    } else {
      await Share.share({ message: json, title: `Export: ${active.name}` });
    }
    Alert.alert('Exported', 'List snapshot ready to share.');
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      if (!parsed.items || !Array.isArray(parsed.items)) {
        Alert.alert('Invalid', 'JSON must include an items array.');
        return;
      }
      Alert.alert(
        'Import ready',
        `Found "${parsed.listName ?? 'Shared list'}" with ${parsed.items.length} items. Full import UI coming soon — data validated successfully.`
      );
    } catch {
      Alert.alert('Invalid JSON', 'Could not parse the import data.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Family Plans" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {!unlocked && <ProUpgradeBanner featureName="Family Plans" />}

        <Text style={styles.lead}>
          Share shopping lists with household members using a family code and JSON snapshots — no backend required for MVP.
        </Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your family code</Text>
          <Text style={styles.codeValue}>{familyCode || '...'}</Text>
          <Text style={styles.codeHint}>Share this code so family members can join your plan</Text>
          <Pressable
            style={styles.copyBtn}
            onPress={async () => {
              if (!familyCode) return;
              if (Platform.OS === 'web') {
                await navigator.clipboard.writeText(familyCode);
              } else {
                await Share.share({ message: familyCode });
              }
              Alert.alert('Copied', 'Family code ready to share.');
            }}>
            <Text style={styles.copyBtnText}>Copy code</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Share a list</Text>
        <Pressable style={styles.actionBtn} onPress={handleExportList}>
          <Text style={styles.actionBtnText}>Export active list to clipboard</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push('/list/share' as never)}>
          <Text style={styles.secondaryBtnText}>Open share screen</Text>
        </Pressable>

        {exportPreview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Last export preview</Text>
            <Text style={styles.previewJson} numberOfLines={8}>
              {exportPreview}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Import shared list</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder='Paste JSON snapshot here…'
          placeholderTextColor={SmartCartColors.textMuted}
          value={importJson}
          onChangeText={setImportJson}
        />
        <Pressable style={styles.actionBtn} onPress={handleImport}>
          <Text style={styles.actionBtnText}>Validate import</Text>
        </Pressable>

        <View style={styles.planInfo}>
          <Text style={styles.planTitle}>Family Pro (up to 5 members)</Text>
          <Text style={styles.planBody}>
            $7.99/mo when billing ships. MVP uses local share codes and clipboard export/import.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 20 },
  codeCard: {
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  codeLabel: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textMuted, textTransform: 'uppercase' },
  codeValue: { fontSize: 28, fontWeight: '800', color: SmartCartColors.primaryDark, marginTop: 8, letterSpacing: 2 },
  codeHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 8, textAlign: 'center' },
  copyBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
  },
  copyBtnText: { fontSize: 14, fontWeight: '700', color: SmartCartColors.primaryDark },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12, marginTop: 8 },
  actionBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    marginBottom: 16,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
  previewBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 16,
  },
  previewLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  previewJson: { fontSize: 11, color: '#4ADE80', fontFamily: 'monospace' },
  textArea: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    minHeight: 100,
    fontSize: 13,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.card,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  planInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  planTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  planBody: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 6, lineHeight: 18 },
});

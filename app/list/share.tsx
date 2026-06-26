import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { buildFamilyInviteUrl, getOrCreateFamilyCode } from '@/src/services/familyCodeService';
import { getListById, getListItems } from '@/src/services/storageService';
import {
  buildListSnapshot,
  isFamilySyncAvailable,
  shareListToFamily,
} from '@/src/services/familySyncService';
import { SmartCartRadius } from '@/src/theme/smartCart';
import { copyText, shareText } from '@/src/utils/copyOrShare';
import { formatCurrency, sumPlannedTotal } from '@/src/utils/priceParser';
import { showInfoAlert } from '@/src/utils/platformAlert';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';

export default function ListShareScreen() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const { unlocked, requestAccess } = useFeatureGate('family_plans');
  const { unlocked: syncUnlocked } = useFeatureGate('multi_user_sync');
  const [familyCode, setFamilyCode] = useState('');
  const [listName, setListName] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedListId, setResolvedListId] = useState<string | null>(null);

  const inviteUrl = useMemo(
    () => (familyCode ? buildFamilyInviteUrl(familyCode) : ''),
    [familyCode]
  );

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const code = await getOrCreateFamilyCode();
      setFamilyCode(code);

      let targetId = listId;
      if (!targetId) {
        const { getActiveList } = await import('@/src/services/storageService');
        const active = await getActiveList();
        targetId = active?.id;
      }
      if (!targetId) {
        setResolvedListId(null);
        return;
      }
      setResolvedListId(targetId);
      const list = await getListById(targetId);
      const items = await getListItems(targetId);
      const name = list?.name ?? 'Shopping list';
      setListName(name);
      setItemCount(items.length);
      setTotal(sumPlannedTotal(items));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const ensureFamilyAccess = (): boolean => requestAccess();

  const handleShare = async () => {
    if (!unlocked) {
      requestAccess();
      return;
    }
    if (!resolvedListId) {
      showInfoAlert('No list to share', 'Create a shopping list first, then come back to share it.');
      return;
    }
    try {
      let snapshot;
      let url: string;
      let synced = false;

      try {
        const result = await shareListToFamily(resolvedListId);
        snapshot = result.snapshot;
        url = result.inviteUrl;
        synced = result.synced;
      } catch (syncError) {
        console.warn('[share] supabase sync unavailable, falling back to clipboard:', syncError);
        const code = familyCode || (await getOrCreateFamilyCode());
        const localSnapshot = await buildListSnapshot(resolvedListId, code);
        if (!localSnapshot) {
          showInfoAlert('Share failed', 'Could not build your list for sharing. Try again.');
          return;
        }
        snapshot = localSnapshot;
        url = buildFamilyInviteUrl(code);
      }

      const payload = JSON.stringify(snapshot, null, 2);
      const message = `Join our family grocery list!\n${url}\n\n${payload}`;
      await shareText(message, `Share: ${listName}`, {
        successTitle: 'Shared with family',
        successMessage: synced
          ? 'Your list is syncing live with your household.'
          : syncUnlocked
            ? 'List shared — tap Sync now on Family Plans if needed.'
            : 'Invite link ready. Upgrade to Pro for live sync.',
      });
    } catch {
      showInfoAlert('Share failed', 'Could not share your list. Try again.');
    }
  };

  const handleCopyInvite = async () => {
    if (!ensureFamilyAccess() || !familyCode) return;
    const url = buildFamilyInviteUrl(familyCode);
    const message = `Join our Penny Pantry family!\nCode: ${familyCode}\n${url}`;
    await copyText(message, {
      title: 'Invite copied',
      message: 'Send this to family members so they can join and receive your lists.',
    });
  };

  const handleCopyCode = async () => {
    if (!ensureFamilyAccess() || !familyCode) return;
    await copyText(familyCode, {
      title: 'Family code copied',
      message: `${familyCode} is on your clipboard. Family members can paste it on Family Plans.`,
    });
  };

  const handleCopyUrl = async () => {
    if (!ensureFamilyAccess() || !familyCode) return;
    const url = buildFamilyInviteUrl(familyCode);
    await copyText(url, {
      title: 'Invite link copied',
      message: 'Share this link so family members can join your household.',
    });
  };

  const shareDisabled = !resolvedListId;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: BG },
          contentStyle: { backgroundColor: BG },
        }}
      />

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Share with family</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Send your grocery list to family members. They can open the invite link or paste the code on Family Plans.
        </Text>

        <View style={styles.previewCard}>
          {loading ? (
            <Text style={styles.previewMuted}>Loading…</Text>
          ) : listName ? (
            <>
              <Text style={styles.previewName}>{listName}</Text>
              <Text style={styles.previewMeta}>
                {itemCount} item{itemCount === 1 ? '' : 's'} · Est. {formatCurrency(total)}
              </Text>
            </>
          ) : (
            <Text style={styles.previewMuted}>No list to share yet</Text>
          )}
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Family code</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unlocked ? `Copy family code ${familyCode}` : 'Unlock family code with Pro'}
            onPress={() => void (unlocked ? handleCopyCode() : ensureFamilyAccess())}
            style={({ pressed }) => [styles.codePressable, pressed && styles.codePressablePressed]}>
            <Text style={[styles.codeValue, !unlocked && styles.codeValueLocked]}>
              {unlocked && familyCode ? familyCode : '••••-••••'}
            </Text>
            <Text style={styles.codeTapHint}>{unlocked ? 'Tap to copy code' : 'Tap to unlock with Pro'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unlocked ? `Copy invite link ${inviteUrl}` : 'Unlock invite link with Pro'}
            onPress={() => void (unlocked ? handleCopyUrl() : ensureFamilyAccess())}
            style={({ pressed }) => [styles.urlPressable, pressed && styles.codePressablePressed]}>
            <Text style={[styles.codeUrl, !unlocked && styles.codeUrlLocked]} numberOfLines={2}>
              {unlocked && inviteUrl ? inviteUrl : 'Invite link available with Pro'}
            </Text>
            <Text style={styles.codeTapHint}>{unlocked ? 'Tap to copy link' : 'Tap to unlock with Pro'}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.shareBtn,
            shareDisabled && styles.shareBtnDisabled,
            pressed && !shareDisabled && styles.shareBtnPressed,
          ]}
          onPress={() => void (unlocked ? handleShare() : requestAccess())}>
          <Text style={styles.shareBtnText}>
            {!unlocked ? 'Unlock with Pro' : Platform.OS === 'web' ? 'Share with family (copy link)' : 'Share with family'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
          onPress={() => void (unlocked ? handleCopyInvite() : ensureFamilyAccess())}>
          <Text style={styles.secondaryBtnText}>
            {unlocked ? 'Copy family invite link' : 'Copy family invite link (Pro)'}
          </Text>
        </Pressable>

        {!isFamilySyncAvailable() ? (
          <Text style={styles.hint}>
            Live sync requires Supabase. You can still share lists via invite link and JSON export.
          </Text>
        ) : syncUnlocked ? (
          <Text style={[styles.hint, styles.hintLive]}>Live sync is on — edits push automatically.</Text>
        ) : (
          <Text style={styles.hint}>Upgrade to Pro for real-time sync with family or roommates.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  pageHeader: { paddingHorizontal: 16, paddingBottom: 4, alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  lead: { fontSize: 14, color: TEXT_MUTED, lineHeight: 20 },
  previewCard: {
    backgroundColor: CARD_BG,
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    gap: 6,
  },
  codeCard: {
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.35)',
    gap: 10,
    alignItems: 'center',
  },
  codeLabel: { fontSize: 11, fontWeight: '700', color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.8 },
  codePressable: { alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: SmartCartRadius.sm },
  urlPressable: { alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: SmartCartRadius.sm, width: '100%' },
  codePressablePressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  codeValue: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: 3 },
  codeValueLocked: { color: TEXT_DIM, letterSpacing: 6 },
  codeUrlLocked: { color: TEXT_DIM },
  codeTapHint: { fontSize: 11, fontWeight: '600', color: TEXT_DIM },
  codeUrl: { fontSize: 12, color: GREEN_DARK, textAlign: 'center' },
  previewName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  previewMeta: { fontSize: 15, fontWeight: '600', color: GREEN },
  previewMuted: { fontSize: 15, color: TEXT_DIM, textAlign: 'center' },
  shareBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  shareBtnDisabled: { opacity: 0.45 },
  shareBtnPressed: { backgroundColor: GREEN_DARK },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  secondaryBtnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  hint: { fontSize: 13, color: TEXT_DIM, lineHeight: 19, textAlign: 'center' },
  hintLive: { color: GREEN_DARK, fontWeight: '600' },
});

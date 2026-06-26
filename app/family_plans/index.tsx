import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import {
  proMonthlyLabel,
} from '@/src/constants/proPricing';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import {
  buildFamilyInviteUrl,
  getOrCreateFamilyCode,
  parseFamilyInviteInput,
} from '@/src/services/familyCodeService';
import { parseFamilyListSnapshot } from '@/src/services/familyListSnapshot';
import { importFamilyListSnapshot } from '@/src/services/familyImportService';
import {
  buildListSnapshot,
  ensureFamilyGroup,
  flushFamilySyncQueue,
  getFamilySyncQueue,
  getLastFamilyExportTimestamp,
  isFamilySyncAvailable,
  joinFamilyGroupByCode,
  shareListToFamily,
  startFamilyRealtimeSync,
} from '@/src/services/familySyncService';
import { getActiveList, getAllLists } from '@/src/services/storageService';
import type { FamilyListSnapshot } from '@/src/services/familyListSnapshot';
import { useListStore } from '@/src/store/useListStore';
import { SmartCartRadius } from '@/src/theme/smartCart';
import { copyText, shareText } from '@/src/utils/copyOrShare';
import { showInfoAlert } from '@/src/utils/platformAlert';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const GOLD = '#EAB308';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';

type StepIconName = {
  ios: 'person.2.fill' | 'square.and.arrow.up.fill' | 'iphone.and.arrow.forward' | 'arrow.triangle.2.circlepath';
  android: 'group' | 'share' | 'phone_android' | 'sync';
  web: 'group' | 'share' | 'phone_android' | 'sync';
};

const SHARE_STEPS = [
  {
    title: 'Get your family code',
    body: 'Every household gets a unique code. Share it with your spouse or kids so they can join.',
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' },
  },
  {
    title: 'Share a shopping list',
    body: 'When your list is ready, tap Share with family to send it to everyone.',
    icon: { ios: 'square.and.arrow.up.fill', android: 'share', web: 'share' },
  },
  {
    title: 'They add it on their phone',
    body: 'Family members paste the invite you sent and choose to merge or start a new list.',
    icon: { ios: 'iphone.and.arrow.forward', android: 'phone_android', web: 'phone_android' },
  },
] as const satisfies ReadonlyArray<{ title: string; body: string; icon: StepIconName }>;

const SYNC_STEP = {
  title: 'Stay in sync automatically',
  body: 'With Pro, everyone sees list updates without copying and pasting each time.',
  icon: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
} as const satisfies { title: string; body: string; icon: StepIconName };

type TierBadgeProps = {
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
};

function TierBadge({ label, accent, accentBg, accentBorder }: TierBadgeProps) {
  return (
    <View style={[styles.tierBadge, { backgroundColor: accentBg, borderColor: accentBorder }]}>
      <Text style={[styles.tierBadgeText, { color: accent }]}>{label}</Text>
    </View>
  );
}

type StepRowProps = {
  step: number;
  title: string;
  body: string;
  icon: StepIconName;
  accent: string;
  locked?: boolean;
};

function StepRow({ step, title, body, icon, accent, locked }: StepRowProps) {
  return (
    <View style={[styles.stepRow, locked && styles.stepRowLocked]}>
      <View style={[styles.stepNumber, { borderColor: `${accent}55`, backgroundColor: `${accent}18` }]}>
        <Text style={[styles.stepNumberText, { color: accent }]}>{step}</Text>
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepTitleRow}>
          <SymbolView
            name={icon}
            tintColor={locked ? TEXT_DIM : accent}
            size={18}
          />
          <Text style={[styles.stepTitle, locked && styles.stepTitleLocked]}>{title}</Text>
        </View>
        <Text style={[styles.stepBody, locked && styles.stepBodyLocked]}>{body}</Text>
      </View>
    </View>
  );
}

export default function FamilyPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unlocked, requestAccess } = useFeatureGate('family_plans');
  const { unlocked: syncUnlocked, requestAccess: requestSyncAccess } = useFeatureGate('multi_user_sync');
  const hasLiveSync = syncUnlocked;

  const [familyCode, setFamilyCode] = useState('');
  const [importText, setImportText] = useState('');
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [syncQueueSize, setSyncQueueSize] = useState(0);

  const loadCode = useCallback(async () => {
    const code = await getOrCreateFamilyCode();
    setFamilyCode(code);
    if (unlocked) {
      try {
        await ensureFamilyGroup();
        if (syncUnlocked) await startFamilyRealtimeSync();
      } catch (error) {
        console.warn('[family_plans] ensureFamilyGroup failed:', error);
      }
    }
    setLastExportAt(await getLastFamilyExportTimestamp());
    setSyncQueueSize((await getFamilySyncQueue()).length);
  }, [unlocked, syncUnlocked]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleExportList = async () => {
    if (!requestAccess()) return;
    const lists = await getAllLists();
    const active = lists.find((l) => l.isActive) ?? lists[0];
    if (!active) {
      showInfoAlert('No lists yet', 'Create a shopping list first, then share it with your family.');
      return;
    }
    try {
      let snapshot;
      let inviteUrl: string;
      let synced = false;

      try {
        const result = await shareListToFamily(active.id);
        snapshot = result.snapshot;
        inviteUrl = result.inviteUrl;
        synced = result.synced;
      } catch (syncError) {
        console.warn('[family_plans] supabase sync unavailable, falling back to clipboard:', syncError);
        const code = familyCode || (await getOrCreateFamilyCode());
        const localSnapshot = await buildListSnapshot(active.id, code);
        if (!localSnapshot) {
          showInfoAlert('Share failed', 'Could not build your list for sharing. Try again.');
          return;
        }
        snapshot = localSnapshot;
        inviteUrl = buildFamilyInviteUrl(code);
      }

      const payload = JSON.stringify(snapshot, null, 2);
      const shareMessage = `${inviteUrl}\n\n${payload}`;
      await shareText(shareMessage, `Share: ${snapshot.listName}`, {
        successTitle: 'Shared with family',
        successMessage: synced
          ? 'Your list is live for your household — invite link copied to the share sheet.'
          : isFamilySyncAvailable()
            ? 'List shared via invite link. Upgrade to Pro for automatic sync.'
            : 'List shared via invite link. Connect Supabase for live sync across devices.',
      });
      setLastExportAt(snapshot.exportedAt ?? null);
      setSyncQueueSize((await getFamilySyncQueue()).length);
    } catch {
      showInfoAlert('Share failed', 'Could not share your list. Try again.');
    }
  };

  const runImport = async (snapshot: FamilyListSnapshot, mode: 'merge' | 'new') => {
    try {
      const active = await getActiveList();
      const result =
        mode === 'merge' && active
          ? await importFamilyListSnapshot(snapshot, { mergeIntoListId: active.id })
          : await importFamilyListSnapshot(snapshot, { createNew: true });
      await useListStore.getState().loadLists();
      await useListStore.getState().loadListItems(result.listId);
      setImportText('');
      Alert.alert(
        'List added',
        `Added ${result.added} item${result.added === 1 ? '' : 's'}${result.skipped ? ` · skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}` : ''}.`
      );
      router.push(`/list/${result.listId}`);
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not add this list.');
    }
  };

  const handleImport = async () => {
    if (!requestAccess()) return;
    const parsed = parseFamilyInviteInput(importText);
    if (!parsed) {
      Alert.alert(
        "Couldn't read invite",
        'Paste a family code, invite link, or the full list JSON your family member sent.'
      );
      return;
    }

    if (parsed.type === 'code') {
      try {
        const result = await joinFamilyGroupByCode(parsed.code);
        setFamilyCode(result.code);
        if (syncUnlocked) await startFamilyRealtimeSync();
        setImportText('');
        Alert.alert('Joined family', `You're now connected to family ${result.code}.`);
      } catch (error) {
        Alert.alert('Join failed', error instanceof Error ? error.message : 'Could not join this family.');
      }
      return;
    }

    try {
      const snapshot = parseFamilyListSnapshot(parsed.raw);
      Alert.alert(
        'Add shared list',
        `"${snapshot.listName ?? 'Shared list'}" has ${snapshot.items.length} items.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge into my list', onPress: () => void runImport(snapshot, 'merge') },
          { text: 'Create new list', onPress: () => void runImport(snapshot, 'new') },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Couldn't read invite",
        error instanceof Error ? error.message : 'Paste the invite link or code your family member sent.'
      );
    }
  };

  const handleFlushSync = async () => {
    if (!requestSyncAccess()) return;
    const flushed = await flushFamilySyncQueue();
    setSyncQueueSize((await getFamilySyncQueue()).length);
    Alert.alert(
      'Sync complete',
      flushed > 0
        ? `Updated ${flushed} shared list${flushed === 1 ? '' : 's'} across your household.`
        : 'Everything is already up to date.'
    );
  };

  const handleCopyCode = async () => {
    if (!requestAccess()) return;
    if (!familyCode) return;
    const inviteUrl = buildFamilyInviteUrl(familyCode);
    const message = `Join our Penny Pantry family list!\nCode: ${familyCode}\n${inviteUrl}`;
    await copyText(message, {
      title: 'Invite copied',
      message: 'Send this to family members so they can join and receive your lists.',
    });
  };

  const heroAccent = hasLiveSync ? GREEN_DARK : unlocked ? GREEN : TEXT_MUTED;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: BG },
          contentStyle: { backgroundColor: BG },
        }}
      />

      <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.pageTitle}>Family Plans</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}>
        {unlocked ? (
          <LinearGradient
            colors={['rgba(22,163,74,0.4)', 'rgba(22,163,74,0.14)', 'rgba(15,15,15,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}>
            <TierBadge
              label="Pro"
              accent={GOLD}
              accentBg="rgba(22,163,74,0.22)"
              accentBorder="rgba(234,179,8,0.45)"
            />
            <Text style={styles.heroTitle}>Your whole household, one list</Text>
            <Text style={styles.heroSubtitle}>
              Share shopping lists with family or roommates and keep everyone in sync — no more duplicate trips to the store.
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.heroCard, styles.heroCardFree]}>
            <TierBadge
              label="Free"
              accent={TEXT_MUTED}
              accentBg="rgba(255,255,255,0.06)"
              accentBorder={CARD_BORDER}
            />
            <Text style={[styles.heroTitle, styles.heroTitleMuted]}>Shop solo on Free</Text>
            <Text style={styles.heroSubtitle}>
              Your basic grocery list works great for one person. Upgrade to Pro to share lists and sync with your family.
            </Text>
            <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall' as never)}>
              <Text style={styles.upgradeBtnText}>Upgrade to Pro — {proMonthlyLabel}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>How it works</Text>
          {SHARE_STEPS.map((step, index) => (
            <StepRow
              key={step.title}
              step={index + 1}
              title={step.title}
              body={step.body}
              icon={step.icon}
              accent={heroAccent}
              locked={!unlocked}
            />
          ))}
          {unlocked && (
            <StepRow
              step={SHARE_STEPS.length + 1}
              title={SYNC_STEP.title}
              body={SYNC_STEP.body}
              icon={SYNC_STEP.icon}
              accent={GREEN_DARK}
              locked={!syncUnlocked}
            />
          )}
        </View>

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'key.fill', android: 'key', web: 'key' }}
              tintColor={unlocked ? (hasLiveSync ? GREEN_DARK : GREEN) : TEXT_DIM}
              size={20}
            />
            <Text style={styles.sectionTitle}>Your family code</Text>
          </View>
          <Text style={styles.sectionHint}>
            {unlocked
              ? 'Share this code with your spouse or kids so they can connect to your family plan.'
              : 'Available with Pro — share lists with up to 5 family members.'}
          </Text>
          <Pressable
            onPress={() => void (unlocked ? handleCopyCode() : requestAccess())}
            style={[styles.codeDisplay, hasLiveSync && styles.codeDisplayHousehold, unlocked && !hasLiveSync && styles.codeDisplayPro, !unlocked && styles.codeDisplayLocked]}>
            <Text style={[styles.codeValue, !unlocked && styles.codeValueLocked]}>
              {unlocked ? familyCode || '…' : '••••-••••'}
            </Text>
            {!unlocked ? <Text style={styles.codeTapHint}>Tap to unlock with Pro</Text> : null}
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, hasLiveSync && styles.primaryBtnHousehold, !unlocked && styles.primaryBtnMuted]}
            onPress={handleCopyCode}>
            <SymbolView
              name={{ ios: 'doc.on.doc.fill', android: 'content_copy', web: 'content_copy' }}
              tintColor={unlocked ? '#000' : TEXT_MUTED}
              size={18}
            />
            <Text style={[styles.primaryBtnText, !unlocked && styles.primaryBtnTextMuted]}>
              {unlocked ? 'Copy family code' : `Unlock with Pro — ${proMonthlyLabel}`}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }}
              tintColor={unlocked ? GREEN : TEXT_DIM}
              size={20}
            />
            <Text style={styles.sectionTitle}>Share a shopping list</Text>
          </View>
          <Text style={styles.sectionHint}>
            Send your active list to family members so they can shop from the same plan.
          </Text>
          <Pressable
            style={[styles.primaryBtn, !unlocked && styles.primaryBtnMuted]}
            onPress={handleExportList}>
            <SymbolView
              name={{ ios: 'square.and.arrow.up.fill', android: 'share', web: 'share' }}
              tintColor={unlocked ? '#000' : TEXT_MUTED}
              size={18}
            />
            <Text style={[styles.primaryBtnText, !unlocked && styles.primaryBtnTextMuted]}>
              Share with family
            </Text>
          </Pressable>
          {unlocked && (
            <Pressable style={styles.secondaryBtn} onPress={() => router.push('/list/share' as never)}>
              <Text style={styles.secondaryBtnText}>Open full share screen</Text>
            </Pressable>
          )}
          {unlocked && lastExportAt && (
            <Text style={styles.metaText}>
              Last shared {new Date(lastExportAt).toLocaleString()}
            </Text>
          )}
        </View>

        {unlocked && (
          <View
            style={[
              styles.sectionCard,
              hasLiveSync ? styles.syncCardHousehold : styles.syncCardPro,
            ]}>
            <View style={styles.sectionHeaderRow}>
              <SymbolView
                name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }}
                tintColor={hasLiveSync ? GREEN_DARK : TEXT_MUTED}
                size={20}
              />
              <Text style={styles.sectionTitle}>Multi-user sync</Text>
              {hasLiveSync && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              )}
            </View>
            {syncUnlocked ? (
              <>
                <Text style={styles.sectionHint}>
                  Lists update across every family member&apos;s phone — no copy and paste needed.
                </Text>
                <View style={styles.syncStats}>
                  <View style={styles.syncStat}>
                    <Text style={styles.syncStatLabel}>Last sync</Text>
                    <Text style={styles.syncStatValue}>
                      {lastExportAt ? new Date(lastExportAt).toLocaleString() : 'Not yet'}
                    </Text>
                  </View>
                  <View style={styles.syncStat}>
                    <Text style={styles.syncStatLabel}>Pending</Text>
                    <Text style={styles.syncStatValue}>{syncQueueSize}</Text>
                  </View>
                </View>
                <Pressable style={[styles.primaryBtn, styles.primaryBtnHousehold]} onPress={() => void handleFlushSync()}>
                  <Text style={styles.primaryBtnText}>Sync now</Text>
                </Pressable>
                {!isFamilySyncAvailable() ? (
                  <Text style={styles.metaText}>
                    Live sync needs Supabase configured (EXPO_PUBLIC_SUPABASE_URL). Copy/paste sharing still works.
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.sectionHint}>
                  Upgrade to Pro for automatic sync with family or roommates — everyone sees the same list.
                </Text>
                <Pressable style={[styles.primaryBtn, styles.primaryBtnHousehold]} onPress={() => router.push('/paywall' as never)}>
                  <Text style={styles.primaryBtnText}>Upgrade to Pro — {proMonthlyLabel}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'tray.and.arrow.down.fill', android: 'download', web: 'download' }}
              tintColor={unlocked ? (hasLiveSync ? GREEN_DARK : GREEN) : TEXT_DIM}
              size={20}
            />
            <Text style={styles.sectionTitle}>Receive a shared list</Text>
          </View>
          <Text style={styles.sectionHint}>
            Paste the invite link or code a family member sent you.
          </Text>
          <TextInput
            style={[styles.textArea, !unlocked && styles.textAreaLocked]}
            multiline
            editable={unlocked}
            placeholder="Paste invite link or code from family member…"
            placeholderTextColor={TEXT_DIM}
            value={importText}
            onChangeText={setImportText}
          />
          <Pressable
            style={[styles.primaryBtn, hasLiveSync && styles.primaryBtnHousehold, !unlocked && styles.primaryBtnMuted]}
            onPress={handleImport}>
            <Text style={[styles.primaryBtnText, !unlocked && styles.primaryBtnTextMuted]}>
              {unlocked ? 'Add to my lists' : `Unlock with Pro — ${proMonthlyLabel}`}
            </Text>
          </Pressable>
        </View>

        {!unlocked && (
          <View style={styles.planCompareCard}>
            <Text style={styles.planCompareTitle}>What you get with Pro</Text>
            <Text style={styles.planCompareItem}>• Family & shared lists — {proMonthlyLabel}</Text>
            <Text style={styles.planCompareItem}>• Multi-user sync & CSV export — included</Text>
            <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall' as never)}>
              <Text style={styles.upgradeBtnText}>Compare Free & Pro</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  pageHeader: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  heroGradient: {
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.4)',
    gap: 12,
  },
  heroCard: {
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  heroCardPro: {
    backgroundColor: CARD_BG,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  heroCardFree: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: CARD_BORDER,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heroTitleMuted: { color: 'rgba(255,255,255,0.75)' },
  heroSubtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '700' },
  upgradeBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  householdLink: { marginTop: 8, paddingVertical: 6 },
  householdLinkText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 19 },
  householdLinkAccent: { color: GREEN_DARK, fontWeight: '600' },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 12,
  },
  sectionCardLocked: { opacity: 0.72 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY, flex: 1 },
  sectionHint: { fontSize: 14, color: TEXT_MUTED, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  stepRowLocked: { opacity: 0.55 },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepNumberText: { fontSize: 14, fontWeight: '800' },
  stepContent: { flex: 1, gap: 4 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  stepTitleLocked: { color: TEXT_MUTED },
  stepBody: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19 },
  stepBodyLocked: { color: TEXT_DIM },
  codeDisplay: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SmartCartRadius.md,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  codeDisplayPro: { borderColor: 'rgba(34,197,94,0.25)' },
  codeDisplayHousehold: {
    borderColor: 'rgba(22,163,74,0.4)',
    backgroundColor: 'rgba(22,163,74,0.1)',
  },
  codeValue: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 3,
  },
  codeValueLocked: { color: TEXT_DIM, letterSpacing: 6 },
  codeDisplayLocked: { opacity: 0.85 },
  codeTapHint: { fontSize: 11, fontWeight: '600', color: TEXT_DIM, marginTop: 6 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryBtnHousehold: { backgroundColor: GREEN_DARK },
  primaryBtnMuted: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  primaryBtnTextMuted: { color: TEXT_MUTED },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  metaText: { fontSize: 12, color: TEXT_DIM, textAlign: 'center' },
  syncCardPro: { borderColor: 'rgba(34,197,94,0.2)' },
  syncCardHousehold: {
    borderColor: 'rgba(22,163,74,0.45)',
    backgroundColor: 'rgba(22,163,74,0.1)',
  },
  liveBadge: {
    backgroundColor: 'rgba(22,163,74,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.4)',
  },
  liveBadgeText: { fontSize: 11, fontWeight: '700', color: GOLD },
  syncStats: { flexDirection: 'row', gap: 12 },
  syncStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SmartCartRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  syncStatLabel: { fontSize: 11, color: TEXT_DIM, fontWeight: '600', textTransform: 'uppercase' },
  syncStatValue: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '600', marginTop: 4 },
  textArea: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: 'rgba(255,255,255,0.03)',
    textAlignVertical: 'top',
  },
  textAreaLocked: { color: TEXT_DIM },
  planCompareCard: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    gap: 10,
  },
  planCompareTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  planCompareItem: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21 },
});

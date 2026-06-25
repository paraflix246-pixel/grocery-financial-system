import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { normalizeFamilyCode } from '@/src/services/familyCodeService';
import { isFamilySyncAvailable, joinFamilyGroupByCode, startFamilyRealtimeSync } from '@/src/services/familySyncService';
import { SmartCartRadius } from '@/src/theme/smartCart';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';

export default function FamilyJoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [joinedCode, setJoinedCode] = useState('');

  const runJoin = useCallback(async (rawCode: string) => {
    setStatus('loading');
    try {
      const normalized = normalizeFamilyCode(rawCode);
      if (!normalized) {
        setStatus('error');
        setMessage('This invite link is missing a valid family code.');
        return;
      }
      const result = await joinFamilyGroupByCode(normalized);
      setJoinedCode(result.code);
      await startFamilyRealtimeSync();
      setStatus('success');
      if (isFamilySyncAvailable()) {
        setMessage(`You're connected to family ${result.code}. Shared lists will sync automatically.`);
      } else {
        setMessage(
          `Joined family ${result.code} on this device. Turn on Supabase sync in settings for live updates across phones.`
        );
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not join this family.');
    }
  }, []);

  useEffect(() => {
    if (code) {
      void runJoin(String(code));
    } else {
      setStatus('error');
      setMessage('No family code found in this link. Ask your family member to resend their invite.');
    }
  }, [code, runJoin]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: BG },
          contentStyle: { backgroundColor: BG },
        }}
      />

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Join family</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {status === 'loading' ? (
            <>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={styles.lead}>Connecting to your family plan…</Text>
            </>
          ) : status === 'success' ? (
            <>
              <Text style={styles.codeValue}>{joinedCode}</Text>
              <Text style={styles.lead}>{message}</Text>
              <Pressable style={styles.primaryBtn} onPress={() => router.replace('/family_plans' as never)}>
                <Text style={styles.primaryBtnText}>Open Family Plans</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/shopping-lists' as never)}>
                <Text style={styles.secondaryBtnText}>Go to my lists</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.errorTitle}>Couldn&apos;t join</Text>
              <Text style={styles.lead}>{message}</Text>
              <Pressable style={[styles.primaryBtn, styles.primaryBtnHousehold]} onPress={() => router.replace('/family_plans' as never)}>
                <Text style={styles.primaryBtnText}>Enter code manually</Text>
              </Pressable>
            </>
          )}
        </View>

        {!isFamilySyncAvailable() && status === 'success' ? (
          <Text style={styles.hint}>
            Live sync requires Supabase (EXPO_PUBLIC_SUPABASE_URL). You can still share lists via copy/paste on Family Plans.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  pageHeader: { paddingHorizontal: 16, paddingBottom: 4, alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, textAlign: 'center' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    alignItems: 'center',
    gap: 16,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 3,
  },
  lead: { fontSize: 15, color: TEXT_MUTED, lineHeight: 22, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  primaryBtn: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnHousehold: { backgroundColor: GREEN_DARK },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  hint: { fontSize: 13, color: TEXT_DIM, lineHeight: 19, textAlign: 'center' },
});

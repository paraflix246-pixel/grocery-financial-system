import { Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { initStorage, storageMode, type StorageMode } from '@/src/services/storageService';

const SLOW_STORAGE_MS = 3_000;

export function StorageSlowBanner() {
  const [mode, setMode] = useState<StorageMode>(storageMode);
  const [slow, setSlow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => {
      if (storageMode === 'pending') setSlow(true);
    }, SLOW_STORAGE_MS);

    initStorage()
      .catch((error) => {
        console.warn('[StorageSlowBanner] storage init error:', error);
      })
      .finally(() => {
        clearTimeout(slowTimer);
        setMode(storageMode);
        setSlow(false);
      });

    return () => clearTimeout(slowTimer);
  }, []);

  if (dismissed) return null;

  const showDegraded = mode === 'async';
  const showSlow = slow && mode === 'pending';
  if (!showDegraded && !showSlow) return null;

  const title = showDegraded ? 'Storage running in backup mode' : 'Storage loading slowly';
  const body = showDegraded
    ? 'SQLite is unavailable. Your data is saved locally via AsyncStorage until the database can open again.'
    : 'The app is ready — data will appear once storage finishes loading.';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        style={styles.banner}
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${body}. Tap to dismiss.`}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.dismiss}>Tap to dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    elevation: 9998,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  body: {
    fontSize: 11,
    lineHeight: 15,
    color: '#78350F',
  },
  dismiss: {
    fontSize: 10,
    color: SmartCartColors.textMuted,
    marginTop: 2,
  },
});

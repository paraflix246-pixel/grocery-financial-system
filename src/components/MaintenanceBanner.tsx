import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fetchPlatformStatus, type PlatformStatus } from '@/src/services/admin/adminApiService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

export function MaintenanceBanner() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchPlatformStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!status) return null;

  const showMaintenance = status.maintenanceMode && status.maintenanceMessage.trim().length > 0;
  const messages = status.activeMessages ?? [];

  if (!showMaintenance && messages.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {showMaintenance ? (
        <View style={styles.maintenance}>
          <Text style={styles.title}>Maintenance</Text>
          <Text style={styles.body}>{status.maintenanceMessage}</Text>
        </View>
      ) : null}
      {messages.map((msg) => (
        <View key={msg.id} style={styles.message}>
          <Text style={styles.title}>{msg.title}</Text>
          <Text style={styles.body}>{msg.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 0 : 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    elevation: 9998,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  maintenance: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  message: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: SmartCartColors.text,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    color: SmartCartColors.textSecondary,
  },
});

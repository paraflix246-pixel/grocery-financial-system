import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SmartCartColors } from '@/src/theme/smartCart';

export default function PriceAlertsRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();

  useEffect(() => {
    const query = new URLSearchParams({ tab: 'alerts' });
    if (params.action) query.set('action', String(params.action));
    router.replace(`/price-tracker?${query.toString()}` as never);
  }, [router, params.action]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={SmartCartColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SmartCartColors.background,
  },
});

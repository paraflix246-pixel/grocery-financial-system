import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors } from '@/src/theme/smartCart';

export default function ManualReceiptScreen() {
  const router = useRouter();
  const startManualEntry = useScanStore((s) => s.startManualEntry);

  useEffect(() => {
    startManualEntry();
    router.replace('/receipt/edit');
  }, [router, startManualEntry]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SmartCartColors.background }}>
      <ActivityIndicator size="large" color={SmartCartColors.primary} />
    </View>
  );
}

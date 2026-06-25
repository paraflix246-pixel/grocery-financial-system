import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type BannerKind = 'expo-go' | 'standalone' | 'offline' | null;

function getBannerKind(): BannerKind {
  if (!__DEV__) return null;

  if (Constants.appOwnership === 'expo') {
    return 'expo-go';
  }

  const metroHost =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null;

  if (Constants.executionEnvironment === ExecutionEnvironment.Standalone && !metroHost) {
    return 'standalone';
  }

  if (!metroHost) {
    return 'offline';
  }

  return null;
}

const MESSAGES: Record<Exclude<BannerKind, null>, { title: string; body: string }> = {
  'expo-go': {
    title: 'Expo Go is not supported',
    body: 'This app needs the dev-client APK (native SQLite, OCR, camera). Run: npx expo start --dev-client',
  },
  standalone: {
    title: 'Preview / standalone APK',
    body: 'Embedded JS bundle — no live Metro. For dev styling and assets, install the development APK and run: npx expo start --dev-client',
  },
  offline: {
    title: 'Metro not connected',
    body: 'Shake device → Dev menu → enter your PC IP:8081, or scan the QR from npx expo start --dev-client',
  },
};

export function DevConnectionBanner() {
  const kind = useMemo(getBannerKind, []);
  const [dismissed, setDismissed] = useState(false);

  if (!kind || dismissed) {
    return null;
  }

  const message = MESSAGES[kind];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        style={styles.banner}
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel={`${message.title}. ${message.body}. Tap to dismiss.`}>
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.body}>{message.body}</Text>
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
    zIndex: 9999,
    elevation: 9999,
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

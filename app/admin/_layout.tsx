import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { verifyAdminAccess } from '@/src/services/admin/adminApiService';
import { OnboardingColors } from '@/src/theme/onboardingTheme';
import { SmartCartColors } from '@/src/theme/smartCart';

export default function AdminLayout() {
  const router = useRouter();
  const [gate, setGate] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const [message, setMessage] = useState('Checking admin access…');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setMessage('Admin dashboard is available on web only.');
      setGate('blocked');
      return;
    }

    void verifyAdminAccess().then((result) => {
      if (result === 'ok') {
        setGate('ok');
        return;
      }
      if (result === 'unauthorized') {
        setMessage('Sign in with an admin account to continue.');
      } else if (result === 'unavailable') {
        setMessage('Admin system is not configured on the server.');
      } else {
        setMessage('You do not have permission to access the admin dashboard.');
      }
      setGate('blocked');
    });
  }, []);

  useEffect(() => {
    if (gate !== 'blocked') return;
    const timer = setTimeout(() => {
      router.replace('/');
    }, 3200);
    return () => clearTimeout(timer);
  }, [gate, router]);

  if (gate === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    );
  }

  if (gate === 'blocked') {
    return (
      <View style={styles.center}>
        <Text style={styles.blockedTitle}>Access denied</Text>
        <Text style={styles.blockedText}>{message}</Text>
        <Text style={styles.redirectHint}>Redirecting…</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: OnboardingColors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: SmartCartColors.text },
        contentStyle: { backgroundColor: OnboardingColors.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Penny Pantry Admin' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingColors.background,
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: SmartCartColors.textSecondary,
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  blockedText: {
    fontSize: 15,
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    maxWidth: 420,
  },
  redirectHint: {
    fontSize: 13,
    color: SmartCartColors.textMuted,
    marginTop: 8,
  },
});

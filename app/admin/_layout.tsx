import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { verifyAdminAccess, syncUserProfile } from '@/src/services/admin/adminApiService';
import { getSession } from '@/src/services/authService';
import { AdminColors } from '@/src/theme/adminTheme';

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

    void (async () => {
      const session = await getSession();
      if (!session) {
        setMessage('Sign in with an admin account to continue.');
        setGate('blocked');
        return;
      }

      await syncUserProfile();
      const result = await verifyAdminAccess();
      if (result.status === 'ok') {
        setGate('ok');
        return;
      }
      if (result.status === 'unauthorized') {
        setMessage('Sign in with an admin account to continue.');
      } else if (result.status === 'unavailable') {
        setMessage(result.message ?? 'Admin system is not configured on the server.');
      } else if (result.status === 'server_error') {
        setMessage(
          result.message ?? 'Admin dashboard is temporarily unavailable. Try again in a moment.'
        );
      } else {
        setMessage('You do not have permission to access the admin dashboard.');
      }
      setGate('blocked');
    })();
  }, []);

  useEffect(() => {
    if (gate !== 'blocked') return;
    const timer = setTimeout(() => {
      router.replace('/');
    }, 3200);
    return () => clearTimeout(timer);
  }, [gate, router]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const previousBodyBackground = document.body.style.backgroundColor;
    const previousColorScheme = document.documentElement.style.colorScheme;

    document.body.style.backgroundColor = AdminColors.background;
    document.documentElement.style.colorScheme = 'light';

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.colorScheme = previousColorScheme;
    };
  }, []);

  if (gate === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
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
        headerShown: false,
        contentStyle: { backgroundColor: AdminColors.background },
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AdminColors.background,
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: AdminColors.textSecondary,
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.text,
  },
  blockedText: {
    fontSize: 15,
    color: AdminColors.textSecondary,
    textAlign: 'center',
    maxWidth: 420,
  },
  redirectHint: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 8,
  },
});

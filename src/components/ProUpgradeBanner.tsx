import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type Props = {
  featureName: string;
};

export function ProUpgradeBanner({ featureName }: Props) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      onPress={() => router.push('/paywall' as never)}>
      <View style={styles.iconWrap}>
        <SymbolView
          name={{ ios: 'star.fill', android: 'star', web: 'star' }}
          tintColor={SmartCartColors.accentPurple}
          size={20}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>Unlock {featureName}</Text>
        <Text style={styles.sub}>Upgrade to SmartCart Pro for full access</Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={SmartCartColors.primary}
        size={16}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    ...SmartCartShadow.cardSoft,
  },
  bannerPressed: { opacity: 0.9 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  sub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
});

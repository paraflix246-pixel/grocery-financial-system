import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/src/components/AppHeader';
import { PremiumScreenBackground } from '@/src/components/PremiumScreenBackground';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

function SkeletonBlock({
  height,
  width = '100%',
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  style?: object;
}) {
  return <View style={[styles.skeleton, { height, width }, style]} />;
}

export const HomeScreenSkeleton = memo(function HomeScreenSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <PremiumScreenBackground>
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <AppHeader showBack={false} notificationCount={0} />

      <SkeletonBlock height={28} width="70%" style={styles.greeting} />
      <SkeletonBlock height={14} width="55%" style={styles.greetingSub} />

      <View style={styles.insightRow}>
        <SkeletonBlock height={88} style={styles.insightCard} />
        <SkeletonBlock height={88} style={styles.insightCard} />
      </View>

      <SkeletonBlock height={120} style={styles.hero} />
      <SkeletonBlock height={96} style={styles.quickActions} />

      <View style={styles.sectionCard}>
        <SkeletonBlock height={16} width="45%" style={styles.sectionTitle} />
        <View style={styles.chartRow}>
          <SkeletonBlock height={128} width={128} style={styles.chartCircle} />
          <View style={styles.legendCol}>
            <SkeletonBlock height={12} width="80%" />
            <SkeletonBlock height={12} width="65%" />
            <SkeletonBlock height={12} width="72%" />
          </View>
        </View>
      </View>
    </View>
    </PremiumScreenBackground>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  skeleton: {
    backgroundColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    opacity: 0.55,
  },
  greeting: { marginBottom: 8 },
  greetingSub: { marginBottom: 16 },
  insightRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  insightCard: { flex: 1, borderRadius: SmartCartRadius.md },
  hero: { borderRadius: SmartCartRadius.lg, marginBottom: 16 },
  quickActions: { borderRadius: SmartCartRadius.md, marginBottom: 16 },
  sectionCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    ...SmartCartShadow.card,
  },
  sectionTitle: { marginBottom: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chartCircle: { borderRadius: 64 },
  legendCol: { flex: 1, gap: 8 },
});

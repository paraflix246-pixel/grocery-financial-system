import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

export default function EnterpriseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Enterprise" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>SmartCart for Teams</Text>
          <Text style={styles.heroSub}>
            Grocery spend management for households, property managers, and corporate cafeterias.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>What's included</Text>
          {[
            'Centralized receipt ingestion & OCR',
            'Multi-user budget controls',
            'SSO & admin dashboard (roadmap)',
            'Custom category rules & approvals',
            'Dedicated support & SLA',
          ].map((item) => (
            <Text key={item} style={styles.bullet}>• {item}</Text>
          ))}
        </View>

        <Pressable
          style={styles.contactBtn}
          onPress={() => Linking.openURL('mailto:enterprise@smartcart.app?subject=Enterprise%20inquiry')}>
          <Text style={styles.contactBtnText}>Contact sales</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => WebBrowser.openBrowserAsync('https://smartcart.app/enterprise')}>
          <Text style={styles.secondaryBtnText}>View enterprise overview</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 24 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: SmartCartColors.text },
  heroSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 8, lineHeight: 20 },
  featureCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  featureTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  bullet: { fontSize: 14, color: SmartCartColors.text, lineHeight: 24 },
  contactBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  contactBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
});

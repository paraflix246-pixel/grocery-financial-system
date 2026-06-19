import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const ENDPOINTS = [
  { method: 'GET', path: '/v1/receipts', desc: 'List receipts with pagination' },
  { method: 'POST', path: '/v1/receipts', desc: 'Submit a parsed receipt' },
  { method: 'GET', path: '/v1/lists', desc: 'Get shopping lists' },
  { method: 'GET', path: '/v1/analytics/spend', desc: 'Monthly spend breakdown' },
  { method: 'GET', path: '/v1/prices/community', desc: 'Crowdsourced price index' },
];

export default function ApiAccessScreen() {
  const router = useRouter();
  const { unlocked } = useFeatureGate('api_access');

  return (
    <View style={styles.container}>
      <ScreenHeader title="API Access" />

      <ScrollView contentContainerStyle={styles.content}>
        {!unlocked && <ProUpgradeBanner featureName="Developer API" />}

        <Text style={styles.lead}>
          Build integrations with SmartCart data. API keys and cloud sync are on the roadmap — this screen documents the planned surface.
        </Text>

        <View style={styles.keyCard}>
          <Text style={styles.keyLabel}>API key (mock)</Text>
          <Text style={styles.keyValue}>
            {unlocked ? 'sk_live_mock_' + 'x'.repeat(24) : '••••••••••••••••••••••••••••'}
          </Text>
          <Text style={styles.keyHint}>
            {unlocked
              ? 'Use this mock key for local development. Production keys will be issued from the developer portal.'
              : 'Upgrade to Pro to reveal your development API key.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Endpoints</Text>
        {ENDPOINTS.map((ep) => (
          <View key={ep.path} style={styles.endpointCard}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodText}>{ep.method}</Text>
            </View>
            <View style={styles.endpointInfo}>
              <Text style={styles.path}>{ep.path}</Text>
              <Text style={styles.endpointDesc}>{ep.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.baseUrl}>
          <Text style={styles.baseLabel}>Base URL (planned)</Text>
          <Text style={styles.baseValue}>https://api.smartcart.app</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 20 },
  keyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 24,
  },
  keyLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  keyValue: { fontSize: 13, fontFamily: 'monospace', color: '#4ADE80', marginTop: 8 },
  keyHint: { fontSize: 12, color: '#6B7280', marginTop: 10, lineHeight: 17 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  endpointCard: {
    flexDirection: 'row',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  methodBadge: {
    backgroundColor: SmartCartColors.accentBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  methodText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  endpointInfo: { flex: 1 },
  path: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text, fontFamily: 'monospace' },
  endpointDesc: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  baseUrl: {
    marginTop: 16,
    padding: 14,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  baseLabel: { fontSize: 12, color: SmartCartColors.textMuted },
  baseValue: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text, marginTop: 4, fontFamily: 'monospace' },
});

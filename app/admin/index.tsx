import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/src/components/admin/AdminShell';
import { UserDetailModal } from '@/src/components/admin/UserDetailModal';
import { type AdminSection, type LocaleFilter } from '@/src/components/admin/utils';
import { ActivityView } from '@/src/components/admin/views/ActivityView';
import { AnalyticsView } from '@/src/components/admin/views/AnalyticsView';
import { PlaceholderSection } from '@/src/components/admin/views/PlaceholderSection';
import { UsersView } from '@/src/components/admin/views/UsersView';
import { AdminColors } from '@/src/theme/adminTheme';

export default function AdminDashboardScreen() {
  const [activeSection, setActiveSection] = useState<AdminSection>('analytics');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.blocked}>Admin dashboard is available on web only.</Text>
      </View>
    );
  }

  const content = (() => {
    switch (activeSection) {
      case 'analytics':
        return <AnalyticsView key={refreshKey} onSelectUser={setSelectedUserId} />;
      case 'users':
        return <UsersView key={refreshKey} onSelectUser={setSelectedUserId} />;
      case 'activity':
        return <ActivityView key={refreshKey} />;
      case 'health':
        return (
          <PlaceholderSection
            title="System Health"
            description="Monitor API uptime, Supabase connectivity, OCR pipeline, and Stripe webhooks."
            items={[
              'Supabase profiles & auth — connected via admin API',
              'Stripe subscriptions — check Payments tab for MRR',
              'PaddleOCR receipt pipeline — monitor separately on OCR server',
            ]}
          />
        );
      case 'messages':
        return (
          <PlaceholderSection
            title="In-App Messages"
            description="Broadcast announcements and targeted messages to Penny Pantry users. Coming soon."
          />
        );
      case 'emails':
        return (
          <PlaceholderSection
            title="Email Campaigns"
            description="Welcome, password reset, and re-engagement emails are sent via Resend. Use Churn Prediction on Analytics to send one-off re-engagement messages."
            items={['Welcome email on signup', 'Password reset & security alerts', 'Re-engagement from Analytics tab']}
          />
        );
      case 'payments':
        return (
          <PlaceholderSection
            title="Payments & Subscriptions"
            description="Pro and Family subscription revenue is estimated from stripe_subscriptions and workspaces tables. Full Stripe dashboard integration coming soon."
            items={['Pro monthly/yearly via Stripe', 'Family household plans via workspace billing', 'MRR estimate on Analytics dashboard']}
          />
        );
      case 'support':
        return (
          <PlaceholderSection
            title="Support & Disputes"
            description="Track user support requests and billing disputes. Wire to your help desk when ready."
            items={['Support tickets — placeholder (0)', 'Flagged/banned accounts — see Analytics']}
          />
        );
      case 'feedback':
        return (
          <PlaceholderSection
            title="User Feedback"
            description="Collect in-app feedback and App Store reviews in one place. Integration pending."
          />
        );
      case 'settings':
        return (
          <PlaceholderSection
            title="Admin Settings"
            description="Configure admin allowlist, notification preferences, and platform defaults."
            items={[
              'Admin access via ADMIN_EMAILS env var',
              'Locale filter (EN/ES) — UI ready; profile locale tracking pending',
            ]}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <AdminShell
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        localeFilter={localeFilter}
        onLocaleFilterChange={setLocaleFilter}
        badges={{ messages: 0, support: 0 }}>
        {localeFilter !== 'all' ? (
          <View style={styles.localeNote}>
            <Text style={styles.localeNoteText}>
              Locale filter ({localeFilter.toUpperCase()}) is active — user locale is not yet stored on profiles; showing all data.
            </Text>
          </View>
        ) : null}
        {content}
      </AdminShell>

      <UserDetailModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onUpdated={handleUserUpdated}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AdminColors.background,
    padding: 24,
  },
  blocked: {
    fontSize: 15,
    color: AdminColors.textSecondary,
    textAlign: 'center',
  },
  localeNote: {
    backgroundColor: AdminColors.warningBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  localeNoteText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
});

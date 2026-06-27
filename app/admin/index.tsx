import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/src/components/admin/AdminShell';
import { UserDetailModal } from '@/src/components/admin/UserDetailModal';
import { type AdminSection, type LocaleFilter } from '@/src/components/admin/utils';
import { ActivityView } from '@/src/components/admin/views/ActivityView';
import { AnalyticsView } from '@/src/components/admin/views/AnalyticsView';
import { EmailsView } from '@/src/components/admin/views/EmailsView';
import { FeedbackView } from '@/src/components/admin/views/FeedbackView';
import { HealthView } from '@/src/components/admin/views/HealthView';
import { MessagesView } from '@/src/components/admin/views/MessagesView';
import { PaymentsView } from '@/src/components/admin/views/PaymentsView';
import { SettingsView } from '@/src/components/admin/views/SettingsView';
import { SupportView } from '@/src/components/admin/views/SupportView';
import { UsersView } from '@/src/components/admin/views/UsersView';
import { fetchAdminBadges, type AdminNavBadgeCounts } from '@/src/services/admin/adminApiService';
import { AdminColors } from '@/src/theme/adminTheme';

export default function AdminDashboardScreen() {
  const [activeSection, setActiveSection] = useState<AdminSection>('analytics');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [badges, setBadges] = useState<AdminNavBadgeCounts>({ messages: 0, support: 0 });

  const loadBadges = useCallback(async () => {
    try {
      setBadges(await fetchAdminBadges());
    } catch {
      setBadges({ messages: 0, support: 0 });
    }
  }, []);

  useEffect(() => {
    void loadBadges();
  }, [loadBadges, refreshKey]);

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
        return <HealthView key={refreshKey} />;
      case 'messages':
        return <MessagesView key={refreshKey} />;
      case 'emails':
        return <EmailsView key={refreshKey} />;
      case 'payments':
        return <PaymentsView key={refreshKey} />;
      case 'support':
        return <SupportView key={refreshKey} />;
      case 'feedback':
        return <FeedbackView key={refreshKey} />;
      case 'settings':
        return <SettingsView key={refreshKey} />;
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
        badges={badges}>
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

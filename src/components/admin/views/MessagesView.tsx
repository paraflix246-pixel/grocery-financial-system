import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import {
  createAdminMessage,
  fetchAdminMessages,
  type AdminMessage,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

export function MessagesView() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminMessages();
      setMessages(result.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await createAdminMessage({ title, body });
      setTitle('');
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create message.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>In-App Messages</Text>
      <Text style={styles.subtitle}>Broadcast announcements shown to signed-in users</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>New broadcast</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={AdminColors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message body"
          placeholderTextColor={AdminColors.textMuted}
          style={[styles.input, styles.textArea]}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          disabled={saving}
          onPress={() => void handleCreate()}>
          <Text style={styles.primaryBtnText}>{saving ? 'Publishing…' : 'Publish message'}</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Recent broadcasts</Text>
        {loading ? (
          <ActivityIndicator color={AdminColors.primary} />
        ) : messages.length === 0 ? (
          <Text style={styles.empty}>No messages yet.</Text>
        ) : (
          messages.map((msg) => (
            <View key={msg.id} style={styles.row}>
              <Text style={styles.rowTitle}>{msg.title}</Text>
              <Text style={styles.rowBody}>{msg.body}</Text>
              <Text style={styles.rowMeta}>
                {msg.is_active ? 'Active' : 'Inactive'} · {formatDate(msg.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  title: { fontSize: 18, fontWeight: '800', color: AdminColors.text },
  subtitle: { fontSize: 13, color: AdminColors.textSecondary },
  errorBanner: {
    backgroundColor: AdminColors.dangerBg,
    borderWidth: 1,
    borderColor: AdminColors.dangerBorder,
    borderRadius: AdminRadius.md,
    padding: 12,
  },
  errorText: { color: AdminColors.danger, fontWeight: '600' },
  panel: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', color: AdminColors.text },
  input: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15,
    color: AdminColors.text,
    backgroundColor: AdminColors.surface,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: AdminRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: AdminColors.primaryText, fontWeight: '700' },
  empty: { color: AdminColors.textMuted, fontSize: 14 },
  row: {
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingVertical: 12,
    gap: 4,
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  rowBody: { fontSize: 13, color: AdminColors.textSecondary },
  rowMeta: { fontSize: 12, color: AdminColors.textMuted },
});

import { StyleSheet, Text, View } from 'react-native';

import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

type PlaceholderSectionProps = {
  title: string;
  description: string;
  items?: string[];
};

export function PlaceholderSection({ title, description, items = [] }: PlaceholderSectionProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item) => (
            <Text key={item} style={styles.item}>
              · {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 20,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: AdminColors.text },
  description: { fontSize: 14, color: AdminColors.textSecondary, lineHeight: 21 },
  list: { gap: 6, marginTop: 4 },
  item: { fontSize: 14, color: AdminColors.textMuted },
});

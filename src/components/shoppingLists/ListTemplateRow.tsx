import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { LIST_TEMPLATES, type ListTemplate } from '@/src/data/listTemplates';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type Props = {
  onSelect: (templateId: string) => void;
  disabled?: boolean;
};

function TemplateCard({ template, onPress, disabled }: { template: ListTemplate; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && !disabled && styles.cardPressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={`Create ${template.name}`}
      disabled={disabled}
      onPress={onPress}>
      {template.storeName ? (
        <StoreBrandAvatar store={template.storeName} variant="card" size={36} />
      ) : (
        <View style={styles.genericIcon}>
          <SymbolView
            name={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }}
            tintColor={SmartCartColors.primaryDark}
            size={18}
          />
        </View>
      )}
      <Text style={styles.cardLabel} numberOfLines={2}>
        {template.name}
      </Text>
      {template.recurrence ? (
        <Text style={styles.recurrence}>{template.recurrence === 'weekly' ? 'Weekly' : 'Monthly'}</Text>
      ) : null}
    </Pressable>
  );
}

export function ListTemplateRow({ onSelect, disabled }: Props) {
  return (
    <HorizontalScrollRow contentContainerStyle={styles.row}>
      {LIST_TEMPLATES.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          disabled={disabled}
          onPress={() => onSelect(template.id)}
        />
      ))}
    </HorizontalScrollRow>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  card: {
    width: 108,
    padding: 12,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    alignItems: 'flex-start',
    gap: 8,
    ...SmartCartShadow.cardSoft,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
  genericIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SmartCartColors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontSize: 12, fontWeight: '700', color: SmartCartColors.text, lineHeight: 16 },
  recurrence: { fontSize: 10, fontWeight: '600', color: SmartCartColors.textMuted },
});

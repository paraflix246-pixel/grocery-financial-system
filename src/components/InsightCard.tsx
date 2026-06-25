import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { memo } from 'react';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type InsightCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'success';
  onPress?: () => void;
  actionHint?: string;
  /** When true, card grows to fill a horizontal row (e.g. side-by-side on wide home). */
  expand?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const InsightCard = memo(function InsightCard({
  title,
  value,
  subtitle,
  variant = 'default',
  onPress,
  actionHint,
  expand = false,
  style,
}: InsightCardProps) {
  const borderColor =
    variant === 'warning'
      ? SmartCartColors.accentOrange
      : variant === 'success'
        ? SmartCartColors.primary
        : SmartCartColors.border;

  const cardStyle = [styles.card, expand && styles.cardExpand, { borderColor }, style];

  const content = (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onPress ? (
          <View style={styles.actionRow}>
            {actionHint ? (
              <Text style={styles.actionHint} numberOfLines={1}>
                {actionHint}
              </Text>
            ) : null}
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textSecondary}
              size={14}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...cardStyle, pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${value}. ${subtitle ?? ''}. ${actionHint ?? 'Open'}`}>
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
});

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    minWidth: 0,
    ...SmartCartShadow.cardSoft,
  },
  cardExpand: {
    flex: 1,
  },
  cardPressed: { opacity: 0.92 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
    minWidth: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
    minWidth: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  actionHint: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.primary,
    flexShrink: 0,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: SmartCartColors.text,
    letterSpacing: -0.3,
    flexShrink: 1,
    minWidth: 0,
  },
  subtitle: {
    fontSize: 12,
    color: SmartCartColors.textSecondary,
    marginTop: 6,
    lineHeight: 17,
    flexShrink: 1,
    minWidth: 0,
  },
});

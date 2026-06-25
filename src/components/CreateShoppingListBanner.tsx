import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';

type Props = {
  onPress: () => void;
  /** Home: nudge toward lists tab. Empty: primary create action on the lists screen. */
  variant?: 'home' | 'empty';
};

export function CreateShoppingListBanner({ onPress, variant = 'home' }: Props) {
  const ctaLabel = variant === 'empty' ? 'Create your first list' : 'Start a new list';
  const subtitle =
    variant === 'empty'
      ? 'Build a list, compare prices across stores, and track what you actually spend.'
      : 'Plan your trip, compare store prices, and see your cart total before you shop.';

  return (
    <Pressable
      style={({ pressed }) => [styles.wrapper, pressed && styles.wrapperPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Create your shopping list. ${subtitle} ${ctaLabel}.`}>
      <LinearGradient
        colors={['#ECFDF5', '#D1FAE5', '#BBF7D0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <View style={styles.glowRing} pointerEvents="none" />
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <SymbolView
              name={{ ios: 'list.bullet.clipboard.fill', android: 'checklist', web: 'checklist' }}
              tintColor={SmartCartColors.primaryDark}
              size={28}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Create your shopping list</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.ctaPill}>
              <SymbolView
                name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                tintColor="#fff"
                size={18}
              />
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: SmartCartRadius.lg,
    marginBottom: 20,
    ...SmartCartShadow.glow,
  },
  wrapperPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  gradient: {
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    overflow: 'hidden',
  },
  glowRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.18)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...SmartCartShadow.pill,
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    color: SmartCartColors.text,
    ...SmartCartTypography.display,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: SmartCartColors.textSecondary,
    marginBottom: 4,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 2,
    borderColor: '#15803D',
    ...SmartCartShadow.fab,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import {
  darken,
  getPromoBorder,
  getPromoBodyText,
  getPromoGlowRing,
  getPromoIconBorder,
  getPromoMutedText,
  getPromoSurfaceGradient,
} from '@/src/theme/themeColorUtils';

type Props = {
  onPress: () => void;
  /** Home: nudge toward lists tab. Empty: primary create action on the lists screen. */
  variant?: 'home' | 'empty';
};

export function CreateShoppingListBanner({ onPress, variant = 'home' }: Props) {
  const { theme } = useAppTheme();
  const ctaLabel = variant === 'empty' ? 'Create your first list' : 'Start a new list';
  const subtitle =
    variant === 'empty'
      ? 'Build a list, compare prices across stores, and track what you actually spend.'
      : 'Plan your trip, compare store prices, and see your cart total before you shop.';

  const promoGradient = useMemo(() => getPromoSurfaceGradient(theme), [theme]);
  const themedStyles = useMemo(
    () => ({
      wrapper: {
        shadowColor: theme.primary,
      },
      gradient: {
        borderColor: getPromoBorder(theme),
      },
      glowRing: {
        borderColor: getPromoGlowRing(theme),
      },
      iconCircle: {
        borderColor: getPromoIconBorder(theme),
      },
      ctaPill: {
        backgroundColor: theme.primary,
        borderColor: darken(theme.primary, 0.2),
        shadowColor: darken(theme.primary, 0.35),
      },
      title: {
        color: getPromoBodyText(theme),
      },
      subtitle: {
        color: getPromoMutedText(theme),
      },
    }),
    [theme]
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.wrapper, themedStyles.wrapper, pressed && styles.wrapperPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Create your shopping list. ${subtitle} ${ctaLabel}.`}>
      <LinearGradient
        colors={promoGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, themedStyles.gradient]}>
        <View style={[styles.glowRing, themedStyles.glowRing]} pointerEvents="none" />
        <View style={styles.content}>
          <View style={[styles.iconCircle, themedStyles.iconCircle]}>
            <SymbolView
              name={{ ios: 'list.bullet.clipboard.fill', android: 'checklist', web: 'checklist' }}
              tintColor={theme.primary}
              size={28}
            />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, themedStyles.title]}>Create your shopping list</Text>
            <Text style={[styles.subtitle, themedStyles.subtitle]}>{subtitle}</Text>
            <View style={[styles.ctaPill, themedStyles.ctaPill]}>
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  wrapperPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  gradient: {
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  glowRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 2,
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
    ...SmartCartTypography.display,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

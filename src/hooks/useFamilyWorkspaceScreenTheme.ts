import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';

import { useFamilyWorkspaceScope } from '@/src/hooks/useFamilyWorkspaceScope';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { FamilyWorkspaceTheme as F } from '@/src/theme/familyWorkspaceTheme';
import { SmartCartColors } from '@/src/theme/smartCart';

export type FamilyWorkspaceScreenTheme = {
  isFamilyScope: boolean;
  background: string;
  backgroundGradientTop: string;
  accentGlow: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  primaryDark: string;
  badge: string;
  tabActiveTint: string;
  tabBarBackground: string;
  screen: ViewStyle;
  cardSurface: ViewStyle;
  emptyCard: ViewStyle;
  actionBtnPressed: ViewStyle;
  footer: ViewStyle;
  primaryText: { color: string };
  activityColor: string;
  selectBtn: ViewStyle;
  householdCard: ViewStyle;
  menuCard: ViewStyle;
};

type Options = {
  /** Override scope detection — e.g. receipt save picker when workspace is selected. */
  active?: boolean;
};

export function useFamilyWorkspaceScreenTheme(options?: Options): FamilyWorkspaceScreenTheme {
  const scopeActive = useFamilyWorkspaceScope();
  const isFamilyScope = options?.active ?? scopeActive;
  const { theme } = useAppTheme();

  return useMemo(() => {
    if (!isFamilyScope) {
      return {
        isFamilyScope: false,
        background: theme.background,
        backgroundGradientTop: theme.backgroundGradientTop,
        accentGlow: theme.accentGlow,
        surface: theme.surface,
        card: SmartCartColors.card,
        border: theme.border,
        primary: theme.primary,
        primaryDark: SmartCartColors.primaryDark,
        badge: SmartCartColors.badge,
        tabActiveTint: theme.primary,
        tabBarBackground: theme.surface,
        screen: { backgroundColor: theme.background },
        cardSurface: {
          backgroundColor: SmartCartColors.card,
          borderColor: theme.border,
        },
        emptyCard: {
          backgroundColor: SmartCartColors.card,
          borderColor: theme.border,
        },
        actionBtnPressed: { backgroundColor: SmartCartColors.badge },
        footer: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        primaryText: { color: SmartCartColors.primaryDark },
        activityColor: theme.primary,
        selectBtn: {
          backgroundColor: SmartCartColors.card,
          borderColor: theme.border,
        },
        householdCard: {},
        menuCard: {},
      };
    }

    return {
      isFamilyScope: true,
      background: F.pageBackground,
      backgroundGradientTop: F.pageGradientTop,
      accentGlow: F.accentGlow,
      surface: F.surfaceCream,
      card: F.cardSurface,
      border: F.border,
      primary: F.accent,
      primaryDark: F.accentDark,
      badge: F.badgeBg,
      tabActiveTint: F.accent,
      tabBarBackground: F.tabBarBackground,
      screen: { backgroundColor: F.pageBackground },
      cardSurface: {
        backgroundColor: F.cardSurface,
        borderColor: F.border,
      },
      emptyCard: {
        backgroundColor: F.cardSurface,
        borderColor: F.borderWarm,
      },
      actionBtnPressed: { backgroundColor: F.badgeBg },
      footer: {
        backgroundColor: F.pageBackground,
        borderTopColor: F.border,
      },
      primaryText: { color: F.accentDark },
      activityColor: F.accent,
      selectBtn: {
        backgroundColor: F.cardSurface,
        borderColor: F.border,
      },
      householdCard: {
        backgroundColor: F.surfaceCream,
        borderColor: F.bannerBorder,
        borderWidth: 1.5,
      },
      menuCard: {
        borderColor: F.border,
      },
    };
  }, [isFamilyScope, theme]);
}

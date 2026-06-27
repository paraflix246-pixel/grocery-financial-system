/**
 * Theme-aware Text and View primitives.
 * Colors come from AppThemeProvider tokens; fonts from AppFontProvider (family only).
 */
import { Text as DefaultText, View as DefaultView, StyleSheet } from 'react-native';

import { useColorScheme } from './useColorScheme';

import Colors from '@/constants/Colors';
import { useAppFontOptional } from '@/src/theme/AppFontProvider';
import { useAppThemeOptional } from '@/src/theme/AppThemeProvider';
import {
  getFontReadabilityStyle,
  remapThemeSurfaceColor,
  remapThemeTextColor,
} from '@/src/theme/fontThemeUtils';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
  /** Use theme.textMuted instead of theme.text when no explicit color is set. */
  muted?: boolean;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors[theme][colorName];
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, muted, ...otherProps } = props;
  const appTheme = useAppThemeOptional();
  const appFont = useAppFontOptional();
  const fontFamily = appFont?.fontFamily;
  const flatStyle = StyleSheet.flatten(style);
  const fallback = muted ? 'textMuted' : 'text';
  const schemeFallback = muted ? 'tabIconDefault' : 'text';
  const schemeColor = useThemeColor({ light: lightColor, dark: darkColor }, schemeFallback);

  let color: string;
  if (lightColor || darkColor) {
    color = appTheme
      ? remapThemeTextColor(schemeColor, appTheme.theme, fallback)
      : schemeColor;
  } else {
    const styleColor =
      flatStyle && typeof flatStyle === 'object' && 'color' in flatStyle
        ? (flatStyle.color as string | undefined)
        : undefined;
    if (appTheme) {
      color = remapThemeTextColor(styleColor, appTheme.theme, fallback);
    } else if (styleColor) {
      color = styleColor;
    } else {
      color = schemeColor;
    }
  }

  const fontReadability = getFontReadabilityStyle(appFont?.fontId, appTheme?.theme);

  return (
    <DefaultText
      style={[fontReadability, fontFamily ? { fontFamily } : undefined, style, { color }]}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const appTheme = useAppThemeOptional();
  const flatStyle = StyleSheet.flatten(style);
  const schemeBackground = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  let backgroundColor: string;
  if (lightColor || darkColor) {
    backgroundColor = schemeBackground;
  } else {
    const styleBg =
      flatStyle && typeof flatStyle === 'object' && 'backgroundColor' in flatStyle
        ? (flatStyle.backgroundColor as string | undefined)
        : undefined;
    backgroundColor =
      appTheme
        ? remapThemeSurfaceColor(styleBg, appTheme.theme, 'background') ??
          appTheme.theme.background
        : styleBg ?? schemeBackground;
  }

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

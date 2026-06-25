import { Platform } from 'react-native';

/** Extra clearance above Android gesture/nav bar (on top of safe area insets). */
export const ANDROID_NAV_EXTRA = 12;

function getAndroidNavExtra(): number {
  return Platform.OS === 'android' ? ANDROID_NAV_EXTRA : 0;
}

/** Icon + label row inside the tab bar (excluding safe-area padding). */
export const TAB_BAR_INNER_HEIGHT = 52;
export const TAB_BAR_TOP_PADDING = 8;

/** Bottom padding inside the tab bar above the system navigation bar. */
export function getTabBarBottomPadding(bottomInset: number): number {
  if (Platform.OS === 'web') return 12;
  if (Platform.OS === 'ios') return Math.max(bottomInset, 20);
  return Math.max(bottomInset, 8) + getAndroidNavExtra();
}

/** Total native tab bar height including system navigation inset. */
export function getTabBarHeight(bottomInset: number): number {
  return TAB_BAR_INNER_HEIGHT + TAB_BAR_TOP_PADDING + getTabBarBottomPadding(bottomInset);
}

/** Scroll/content padding clearing the tab bar on tab screens. */
export function getTabScreenScrollBottomPadding(bottomInset: number, extra = 16): number {
  if (Platform.OS === 'web') return 88 + extra;
  return getTabBarHeight(bottomInset) + extra;
}

/** Bottom padding for full-screen stack routes (no tab bar). */
export function getScreenBottomPadding(bottomInset: number, extra = 24): number {
  const minInset = Platform.OS === 'android' ? 16 : 12;
  return Math.max(bottomInset, minInset) + extra + getAndroidNavExtra();
}

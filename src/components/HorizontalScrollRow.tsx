import type { ReactNode } from 'react';
import { Platform, ScrollView, type StyleProp, type ViewStyle } from 'react-native';

const horizontalScrollProps = {
  horizontal: true as const,
  scrollEnabled: true,
  nestedScrollEnabled: true,
  directionalLockEnabled: true,
  keyboardShouldPersistTaps: 'handled' as const,
  alwaysBounceHorizontal: false as const,
  overScrollMode: 'never' as const,
};

type RowProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsHorizontalScrollIndicator?: boolean;
  /** When set, cards/chips snap while swiping (native). */
  snapToInterval?: number;
};

const webScrollStyle: ViewStyle = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  flexGrow: 0,
  flexShrink: 1,
  overflowX: 'auto',
  overflowY: 'hidden',
  touchAction: 'pan-x',
  WebkitOverflowScrolling: 'touch',
} as ViewStyle;

const nativeScrollStyle: ViewStyle = {
  alignSelf: 'stretch',
  flexGrow: 0,
  flexShrink: 1,
};

/** Horizontal chip/tab/logo rows that may extend past the viewport. */
export function HorizontalScrollRow({
  children,
  style,
  contentContainerStyle,
  showsHorizontalScrollIndicator,
  snapToInterval,
}: RowProps) {
  const showIndicator = showsHorizontalScrollIndicator ?? Platform.OS !== 'web';

  return (
    <ScrollView
      {...horizontalScrollProps}
      showsHorizontalScrollIndicator={showIndicator}
      snapToInterval={snapToInterval}
      snapToAlignment={snapToInterval != null ? 'start' : undefined}
      decelerationRate={snapToInterval != null ? 'fast' : undefined}
      disableIntervalMomentum={snapToInterval != null}
      style={[Platform.OS === 'web' ? webScrollStyle : nativeScrollStyle, style]}
      contentContainerStyle={contentContainerStyle}>
      {children}
    </ScrollView>
  );
}

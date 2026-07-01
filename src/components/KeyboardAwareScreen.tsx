import type { ReactNode, RefObject } from 'react';
import { useCallback, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  keyboardVerticalOffset?: number;
  scrollRef?: RefObject<ScrollView | null>;
};

/** ScrollView + KeyboardAvoidingView; call `scrollFocusedFieldIntoView` from TextInput onFocus. */
export function KeyboardAwareScreen({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 64 : 0,
  scrollRef: externalScrollRef,
}: Props) {
  const internalScrollRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={Platform.OS === 'web'}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Scrolls a focused field toward the center of the visible area (iOS keyboard safe). */
export function useScrollFieldIntoView(scrollRef: RefObject<ScrollView | null>) {
  return useCallback(
    (yOffset: number) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, yOffset - 80), animated: true });
    },
    [scrollRef]
  );
}

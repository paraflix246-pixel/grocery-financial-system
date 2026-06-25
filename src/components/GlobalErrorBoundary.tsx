import React, { Component, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  children: ReactNode;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
  componentStack: string | null;
};

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

function ErrorScreen({
  error,
  componentStack,
  onRetry,
}: {
  error: Error;
  componentStack?: string | null;
  onRetry?: () => void;
}) {
  const message = error.message?.trim() || String(error) || 'Unknown error';
  const stack = error.stack?.trim();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>App error</Text>
        <Text style={styles.subtitle}>
          Penny Pantry hit a problem. Details below — share this screen if you need help.
        </Text>
        <View style={styles.errorBox}>
          <Text style={styles.errorMessage}>{message}</Text>
          {stack ? <Text style={styles.errorStack}>{stack}</Text> : null}
          {componentStack ? (
            <>
              <Text style={styles.stackLabel}>Component stack</Text>
              <Text style={styles.errorStack}>{componentStack}</Text>
            </>
          ) : null}
        </View>
        {onRetry ? (
          <Pressable style={styles.button} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Catches render errors anywhere under the root layout. */
export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: normalizeError(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('GlobalErrorBoundary:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private handleRetry = (): void => {
    this.setState({ error: null, componentStack: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          componentStack={this.state.componentStack}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

/** Expo Router route-level error boundary (export from app/_layout.tsx). */
export function ErrorBoundary({
  error,
  retry,
}: {
  error: unknown;
  retry: () => Promise<void>;
}): ReactNode {
  return (
    <ErrorScreen
      error={normalizeError(error)}
      onRetry={() => {
        void retry();
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SmartCartColors.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: SmartCartColors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: SmartCartColors.textSecondary,
  },
  errorBox: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    gap: 8,
  },
  errorMessage: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9333EA',
  },
  stackLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.text,
    marginTop: 4,
  },
  errorStack: {
    fontSize: 11,
    lineHeight: 16,
    color: SmartCartColors.textSecondary,
    fontFamily: 'monospace',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: SmartCartColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

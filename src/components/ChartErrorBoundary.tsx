import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = { children: ReactNode; fallbackMessage?: string };
type State = { error: Error | null };

/** Isolates chart/reanimated failures so the rest of the app keeps working. */
export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.warn('ChartErrorBoundary:', error.message);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Chart unavailable</Text>
          <Text style={styles.fallbackText}>
            {this.props.fallbackMessage ??
              'Spending data is still saved — the chart could not render on this device.'}
          </Text>
          <Text style={styles.fallbackDetail}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 120,
    padding: 20,
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: SmartCartRadius.md,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  fallbackText: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 18,
  },
  fallbackDetail: {
    fontSize: 11,
    color: '#9333EA',
    marginTop: 4,
  },
});

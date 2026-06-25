import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { ChartErrorBoundary } from '@/src/components/ChartErrorBoundary';
import { RobinhoodSpendChart } from '@/src/components/RobinhoodSpendChart';
import type { Receipt } from '@/src/models/types';

type Props = {
  receipts: Receipt[];
  style?: StyleProp<ViewStyle>;
  fullBleed?: boolean;
};

export const SpendingAnalyticsCard = memo(function SpendingAnalyticsCard({
  receipts,
  style,
  fullBleed,
}: Props) {
  return (
    <ChartErrorBoundary>
      <RobinhoodSpendChart receipts={receipts} style={style} fullBleed={fullBleed} />
    </ChartErrorBoundary>
  );
});

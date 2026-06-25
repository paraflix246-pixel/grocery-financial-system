import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PointerEvent as RNPointerEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/Themed';
import type { Receipt } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';
import {
  ROBINHOOD_RANGE_OPTIONS,
  ROBINHOOD_COMPARISON_LABELS,
  buildRobinhoodSpendAnalytics,
  clampZoomFactor,
  formatChartHeaderDate,
  formatTooltipDate,
  shiftPeriodOffset,
  type RobinhoodChartPoint,
  type RobinhoodChartRange,
} from '@/src/utils/robinhoodSpendAnalytics';

const CHART_HEIGHT = 180;
const ACTIVE_PILL = '#6B46C1';
const LINE_GREEN = '#22C55E';
const LINE_RED = '#EF4444';
const LINE_GREEN_LIGHT = '#86EFAC';
const LINE_RED_LIGHT = '#FCA5A5';
const SCRUB_LINE_COLOR = '#6B46C1';
const ANIM_MS = 200;
const SWIPE_THRESHOLD = 48;
const TAP_HIT_RADIUS = 28;

type Props = {
  receipts: Receipt[];
  style?: StyleProp<ViewStyle>;
  fullBleed?: boolean;
};

type Coord = { x: number; y: number; index: number };

function dateToMs(iso: string): number {
  return new Date(`${iso}T12:00:00`).getTime();
}

function buildSmoothPaths(
  points: RobinhoodChartPoint[],
  width: number,
  height: number
): {
  linePath: string;
  areaPath: string;
  coords: Coord[];
} {
  if (points.length === 0 || width <= 0) {
    return { linePath: '', areaPath: '', coords: [] };
  }

  const paddingTop = 16;
  const paddingBottom = 12;
  const chartH = height - paddingTop - paddingBottom;
  const minTime = dateToMs(points[0].date);
  const maxTime = dateToMs(points[points.length - 1].date);
  const timeSpan = Math.max(maxTime - minTime, 1);
  const maxValue = Math.max(...points.map((p) => p.cumulative), 1);

  const coords = points.map((point, index) => ({
    index,
    x: ((dateToMs(point.date) - minTime) / timeSpan) * width,
    y: paddingTop + chartH - (point.cumulative / maxValue) * chartH,
  }));

  if (coords.length === 1) {
    const c = coords[0];
    return {
      linePath: '',
      areaPath: '',
      coords: [{ ...c, x: Math.min(Math.max(c.x, 8), width - 8), y: c.y }],
    };
  }

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const baseline = paddingTop + chartH;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baseline} L ${coords[0].x} ${baseline} Z`;

  return { linePath, areaPath, coords };
}

function findNearestPointIndex(coords: Coord[], touchX: number): number {
  if (coords.length === 0) return 0;
  let nearest = coords[0].index;
  let best = Math.abs(coords[0].x - touchX);
  for (const coord of coords) {
    const dist = Math.abs(coord.x - touchX);
    if (dist < best) {
      best = dist;
      nearest = coord.index;
    }
  }
  return nearest;
}

function findNearestReceiptPointIndex(
  coords: Coord[],
  points: RobinhoodChartPoint[],
  touchX: number,
  touchY: number
): number | null {
  let best: { index: number; dist: number } | null = null;
  for (const coord of coords) {
    const point = points[coord.index];
    if (!point?.receiptId) continue;
    const dist = Math.hypot(coord.x - touchX, coord.y - touchY);
    if (dist <= TAP_HIT_RADIUS && (!best || dist < best.dist)) {
      best = { index: coord.index, dist };
    }
  }
  return best?.index ?? null;
}

function lastReceiptPointIndex(points: RobinhoodChartPoint[]): number {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].receiptId) return i;
  }
  return Math.max(points.length - 1, 0);
}

function formatSignedCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = formatCurrency(abs);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function getLocalTouchX(event: GestureResponderEvent): number {
  const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
    offsetX?: number;
  };
  return native.locationX ?? native.offsetX ?? 0;
}

function getLocalTouchY(event: GestureResponderEvent): number {
  const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
    offsetY?: number;
  };
  return native.locationY ?? native.offsetY ?? 0;
}

function ChartTouchOverlay({
  enabled,
  onScrub,
  onScrubEnd,
  onTap,
  onSwipe,
}: {
  enabled: boolean;
  onScrub: (x: number) => void;
  onScrubEnd: () => void;
  onTap: (x: number, y: number) => void;
  onSwipe: (direction: 'past' | 'present') => void;
}) {
  const touchStart = useRef({ x: 0, y: 0, active: false });

  const finishTouch = useCallback(
    (x: number, y: number) => {
      if (!touchStart.current.active) return;
      const tx = x - touchStart.current.x;
      const ty = y - touchStart.current.y;
      const isSwipe =
        Math.abs(tx) >= SWIPE_THRESHOLD && Math.abs(ty) < SWIPE_THRESHOLD * 0.75;
      if (isSwipe) {
        onSwipe(tx > 0 ? 'present' : 'past');
      } else if (Math.abs(tx) < 10 && Math.abs(ty) < 10) {
        onTap(x, y);
      }
      touchStart.current.active = false;
      onScrubEnd();
    },
    [onScrubEnd, onSwipe, onTap]
  );

  const beginTouch = useCallback(
    (x: number, y: number) => {
      touchStart.current = { x, y, active: true };
      onScrub(x);
    },
    [onScrub]
  );

  if (!enabled) return null;

  return (
    <View
      style={styles.touchOverlay}
      collapsable={false}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        beginTouch(getLocalTouchX(event), getLocalTouchY(event));
      }}
      onResponderMove={(event) => {
        onScrub(getLocalTouchX(event));
      }}
      onResponderRelease={(event) => {
        finishTouch(getLocalTouchX(event), getLocalTouchY(event));
      }}
      onResponderTerminate={() => {
        touchStart.current.active = false;
        onScrubEnd();
      }}
      {...(Platform.OS === 'web'
        ? {
            onPointerDown: (event: RNPointerEvent) => {
              event.preventDefault?.();
              beginTouch(event.nativeEvent.offsetX ?? 0, event.nativeEvent.offsetY ?? 0);
            },
            onPointerMove: (event: RNPointerEvent) => {
              if (touchStart.current.active) {
                onScrub(event.nativeEvent.offsetX ?? 0);
              }
            },
            onPointerUp: (event: RNPointerEvent) => {
              finishTouch(event.nativeEvent.offsetX ?? 0, event.nativeEvent.offsetY ?? 0);
            },
            onPointerLeave: () => {
              if (touchStart.current.active) {
                touchStart.current.active = false;
                onScrubEnd();
              }
            },
          }
        : {})}
    />
  );
}

function triggerHapticTick() {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(1);
    }
    return;
  }
  void Haptics.selectionAsync();
}

function ChartTooltip({
  point,
  x,
  y,
  chartWidth,
}: {
  point: RobinhoodChartPoint;
  x: number;
  y: number;
  chartWidth: number;
}) {
  const tooltipWidth = 168;
  const left = Math.min(Math.max(x - tooltipWidth / 2, 8), Math.max(chartWidth - tooltipWidth - 8, 8));

  return (
    <View
      style={[
        styles.tooltip,
        {
          left,
          top: Math.max(y - 88, 4),
          width: tooltipWidth,
        },
      ]}
      pointerEvents="none">
      <Text style={styles.tooltipDate}>{formatTooltipDate(point.date)}</Text>
      <Text style={styles.tooltipTotal}>{formatCurrency(point.amount)}</Text>
      {point.storeName ? (
        <Text style={styles.tooltipMeta}>{point.storeName}</Text>
      ) : null}
      {point.receiptId ? (
        <Text style={styles.tooltipMeta}>{point.itemCount ?? 0} items</Text>
      ) : null}
    </View>
  );
}

export function RobinhoodSpendChart({ receipts, style, fullBleed = false }: Props) {
  const [range, setRange] = useState<RobinhoodChartRange>('1m');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [chartWidth, setChartWidth] = useState(0);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const lastScrubIndex = useRef<number | null>(null);

  const analytics = useMemo(
    () =>
      buildRobinhoodSpendAnalytics(receipts, range, new Date(), {
        periodOffset,
        zoomFactor,
      }),
    [receipts, range, periodOffset, zoomFactor]
  );

  const { linePath, areaPath, coords } = useMemo(
    () => buildSmoothPaths(analytics.chartPoints, chartWidth, CHART_HEIGHT),
    [analytics.chartPoints, chartWidth]
  );

  const dotIndex = useMemo(
    () => lastReceiptPointIndex(analytics.chartPoints),
    [analytics.chartPoints]
  );
  const dotCoord = coords.find((c) => c.index === dotIndex) ?? coords[coords.length - 1];
  const scrubCoord = scrubIndex != null ? coords.find((c) => c.index === scrubIndex) : null;
  const tooltipCoord = tooltipIndex != null ? coords.find((c) => c.index === tooltipIndex) : null;
  const tooltipPoint =
    tooltipIndex != null ? analytics.chartPoints[tooltipIndex] : null;

  const activePoint = scrubIndex != null ? analytics.chartPoints[scrubIndex] : null;
  const headerTotalValue =
    activePoint != null
      ? activePoint.receiptId
        ? activePoint.amount
        : activePoint.cumulative
      : analytics.periodTotal;

  // Always show a date: scrub point date → or period end date
  const displayDate = activePoint
    ? formatChartHeaderDate(activePoint.date)
    : formatChartHeaderDate(analytics.windowEnd);

  const chartOpacity = useSharedValue(1);
  const pinchScale = useSharedValue(1);

  useEffect(() => {
    chartOpacity.value = withTiming(0.55, { duration: ANIM_MS / 2 }, (finished) => {
      if (finished) {
        chartOpacity.value = withTiming(1, { duration: ANIM_MS });
      }
    });
  }, [analytics.chartPoints, analytics.periodTotal, chartOpacity]);

  const chartFadeStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
  }));

  const onChartLayout = useCallback((event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  }, []);

  const updateScrub = useCallback(
    (touchX: number) => {
      if (coords.length === 0) return;
      setTooltipIndex(null);
      const index = findNearestPointIndex(coords, touchX);
      if (lastScrubIndex.current !== index) {
        lastScrubIndex.current = index;
        triggerHapticTick();
      }
      setScrubIndex(index);
    },
    [coords]
  );

  const clearScrub = useCallback(() => {
    setScrubIndex(null);
    lastScrubIndex.current = null;
  }, []);

  const handleTap = useCallback(
    (touchX: number, touchY: number) => {
      const receiptIndex = findNearestReceiptPointIndex(
        coords,
        analytics.chartPoints,
        touchX,
        touchY
      );
      if (receiptIndex != null) {
        setTooltipIndex((prev) => (prev === receiptIndex ? null : receiptIndex));
        clearScrub();
        return;
      }
      setTooltipIndex(null);
    },
    [analytics.chartPoints, clearScrub, coords]
  );

  const handleSwipe = useCallback(
    (direction: 'past' | 'present') => {
      setPeriodOffset((current) => shiftPeriodOffset(range, current, direction));
      setTooltipIndex(null);
      clearScrub();
    },
    [clearScrub, range]
  );

  const handlePinchEnd = useCallback((scale: number) => {
    setZoomFactor((current) => clampZoomFactor(current * scale));
  }, []);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          pinchScale.value = event.scale;
        })
        .onEnd((event) => {
          pinchScale.value = withTiming(1, { duration: ANIM_MS });
          runOnJS(handlePinchEnd)(event.scale);
        }),
    [handlePinchEnd, pinchScale]
  );

  const selectRange = useCallback(
    (next: RobinhoodChartRange) => {
      setRange(next);
      setPeriodOffset(0);
      setZoomFactor(1);
      setTooltipIndex(null);
      clearScrub();
    },
    [clearScrub]
  );

  const resetToToday = useCallback(() => {
    setPeriodOffset(0);
    setZoomFactor(1);
    setTooltipIndex(null);
    clearScrub();
  }, [clearScrub]);

  const showChart = analytics.hasReceiptsInPeriod && chartWidth > 0 && coords.length > 0;
  const singlePoint = analytics.chartPoints.filter((p) => p.receiptId).length === 1;
  const showComparison =
    analytics.range !== 'all' &&
    analytics.hasAnyReceipts &&
    scrubIndex == null &&
    !analytics.isViewingPastPeriod;

  // Robinhood logic: green = good (spending down), red = bad (spending up)
  const lineColor = analytics.isSpendingUp ? LINE_RED : LINE_GREEN;
  const lineLightColor = analytics.isSpendingUp ? LINE_RED_LIGHT : LINE_GREEN_LIGHT;

  const chartSvgContent = (
    <>
      <Defs>
        <LinearGradient id="rhArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <Stop offset="60%" stopColor={lineLightColor} stopOpacity="0.08" />
          <Stop offset="100%" stopColor={lineLightColor} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {areaPath && !singlePoint ? <Path d={areaPath} fill="url(#rhArea)" /> : null}
      {linePath && !singlePoint ? (
        <Path
          d={linePath}
          stroke={lineColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {scrubCoord ? (
        <Line
          x1={scrubCoord.x}
          x2={scrubCoord.x}
          y1={0}
          y2={CHART_HEIGHT}
          stroke={SCRUB_LINE_COLOR}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      ) : null}
      {scrubCoord ? (
        <Circle
          cx={scrubCoord.x}
          cy={scrubCoord.y}
          r={5}
          fill={lineColor}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      ) : null}
      {dotCoord && scrubIndex == null && tooltipIndex == null ? (
        <Circle cx={dotCoord.x} cy={dotCoord.y} r={4} fill={lineColor} />
      ) : null}
      {singlePoint && dotCoord ? (
        <Circle cx={dotCoord.x} cy={dotCoord.y} r={4} fill={lineColor} />
      ) : null}
      {tooltipCoord && tooltipIndex != null ? (
        <Circle
          cx={tooltipCoord.x}
          cy={tooltipCoord.y}
          r={6}
          fill={lineColor}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      ) : null}
    </>
  );

  const interactiveChart = (
    <Animated.View
      style={[styles.chartTouchArea, chartFadeStyle]}
      onLayout={onChartLayout}>
      <Svg width={chartWidth} height={CHART_HEIGHT} pointerEvents="none">
        {chartSvgContent}
      </Svg>
      {tooltipPoint && tooltipCoord ? (
        <ChartTooltip
          point={tooltipPoint}
          x={tooltipCoord.x}
          y={tooltipCoord.y}
          chartWidth={chartWidth}
        />
      ) : null}
      <ChartTouchOverlay
        enabled
        onScrub={updateScrub}
        onScrubEnd={clearScrub}
        onTap={handleTap}
        onSwipe={handleSwipe}
      />
    </Animated.View>
  );

  return (
    <View style={[styles.root, fullBleed && styles.fullBleed, style]}>
      <View style={styles.panel}>
        {/* Header: date + big amount */}
        <View style={styles.header}>
          <Text style={styles.headerDate}>{displayDate}</Text>
          <Text style={styles.headerTotal}>{formatCurrency(headerTotalValue)}</Text>
          {analytics.isViewingPastPeriod && scrubIndex == null ? (
            <Pressable
              style={styles.backToToday}
              accessibilityRole="button"
              onPress={resetToToday}>
              <Text style={styles.backToTodayText}>Back to today</Text>
            </Pressable>
          ) : null}
          {showComparison ? (
            <View style={styles.changeRow}>
              <Text
                style={[
                  styles.headerChange,
                  { color: analytics.isSpendingUp ? LINE_RED : LINE_GREEN },
                ]}>
                {formatSignedCurrency(analytics.dollarChange)}{' '}
                <Text style={styles.comparisonLabel}>
                  ({analytics.percentChange >= 0 ? '+' : ''}
                  {analytics.percentChange.toFixed(1)}%){' '}
                  {ROBINHOOD_COMPARISON_LABELS[analytics.range]}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>

        {/* Period pills — above chart */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRowContent}
          style={styles.pillRow}>
          {ROBINHOOD_RANGE_OPTIONS.map((option) => {
            const active = option.id === range;
            return (
              <Pressable
                key={option.id}
                style={[styles.pill, active && styles.pillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectRange(option.id)}>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Chart */}
        {showChart ? (
          Platform.OS === 'web' ? (
            interactiveChart
          ) : (
            <GestureDetector gesture={pinchGesture}>{interactiveChart}</GestureDetector>
          )
        ) : (
          <Animated.View
            style={[styles.chartTouchArea, chartFadeStyle]}
            onLayout={onChartLayout}>
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>{analytics.emptyMessage}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
  },
  fullBleed: {
    marginHorizontal: -16,
    width: 'auto',
    alignSelf: 'stretch',
  },
  panel: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: SmartCartRadius.md,
    overflow: 'hidden',
    ...SmartCartShadow.card,
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 2,
  },
  headerDate: {
    color: SmartCartColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  headerTotal: {
    color: SmartCartColors.text,
    fontSize: 36,
    lineHeight: 44,
    ...SmartCartTypography.display,
  },
  headerChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  comparisonLabel: {
    color: SmartCartColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  backToToday: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    marginTop: 4,
  },
  backToTodayText: {
    color: ACTIVE_PILL,
    fontSize: 12,
    fontWeight: '600',
  },
  pillRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: SmartCartColors.border,
  },
  pillRowContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: ACTIVE_PILL,
    borderColor: ACTIVE_PILL,
  },
  pillText: {
    color: SmartCartColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  chartTouchArea: {
    height: CHART_HEIGHT,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? ({
          touchAction: 'none',
          cursor: 'crosshair',
          userSelect: 'none',
        } as unknown as ViewStyle)
      : null),
  },
  emptyChart: {
    width: '100%',
    height: CHART_HEIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: SmartCartColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    flexShrink: 1,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  tooltipDate: {
    color: SmartCartColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipTotal: {
    color: SmartCartColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tooltipMeta: {
    color: SmartCartColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});

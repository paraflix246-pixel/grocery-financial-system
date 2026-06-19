import { BarChart } from 'react-native-gifted-charts';

type BarDatum = { value: number; label: string; frontColor?: string };

type Props = {
  data: BarDatum[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  spacing?: number;
};

export function WeeklyBarChart({
  data,
  maxValue,
  height = 160,
  barWidth = 32,
  spacing = 20,
}: Props) {
  return (
    <BarChart
      data={data}
      barWidth={barWidth}
      spacing={spacing}
      roundedTop
      hideRules
      yAxisThickness={0}
      xAxisThickness={0}
      noOfSections={4}
      maxValue={maxValue}
      height={height}
    />
  );
}

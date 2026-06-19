import { PieChart } from 'react-native-gifted-charts';

type PieDatum = { value: number; text: string; color: string };

type Props = {
  data: PieDatum[];
};

export function CategoryPieChart({ data }: Props) {
  return (
    <PieChart data={data} donut radius={70} innerRadius={40} showText />
  );
}

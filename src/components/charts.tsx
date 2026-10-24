import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

type ChartProps = {
  height: number;
  summary: string;
  format: (v: number) => string;
};

function useWidth() {
  const [width, setWidth] = useState(0);
  return [
    width,
    (e: { nativeEvent: { layout: { width: number } } }) => setWidth(e.nativeEvent.layout.width),
  ] as const;
}

export function BarChart({
  values,
  labels,
  height,
  summary,
  format,
}: ChartProps & { values: number[]; labels: string[] }) {
  const scheme = useScheme();
  const [width, onLayout] = useWidth();
  const max = Math.max(1, ...values);
  const gap = 6;
  const barWidth = values.length ? (width - gap * (values.length - 1)) / values.length : 0;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} className="gap-1">
      <Text className="font-regular text-caption text-muted-foreground">{format(max)}</Text>
      <View onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line
              x1={0}
              x2={width}
              y1={height - 0.5}
              y2={height - 0.5}
              stroke={hex(scheme, 'border')}
            />
            {values.map((v, i) => {
              const h = v ? Math.max(3, (v / max) * (height - 4)) : 0;
              return (
                <Rect
                  key={i}
                  x={i * (barWidth + gap)}
                  y={height - h}
                  width={barWidth}
                  height={h}
                  rx={3}
                  fill={hex(scheme, i === values.length - 1 ? 'primary-text' : 'primary')}
                />
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row justify-between">
        {labels.map((l, i) => (
          <Text key={i} className="font-regular text-caption text-muted-foreground">
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function LineChart({
  points,
  labels,
  height,
  summary,
  format,
}: ChartProps & { points: number[]; labels: [string, string] }) {
  const scheme = useScheme();
  const [width, onLayout] = useWidth();
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min;
  const pad = 6;
  const xy = points.map((v, i) => [
    points.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (points.length - 1),
    max === min ? height / 2 : pad + (1 - (v - min) / span) * (height - 2 * pad),
  ]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} className="gap-1">
      <Text className="font-regular text-caption text-muted-foreground">{format(max)}</Text>
      <View onLayout={onLayout}>
        {width > 0 && points.length ? (
          <Svg width={width} height={height}>
            <Line
              x1={0}
              x2={width}
              y1={height - 0.5}
              y2={height - 0.5}
              stroke={hex(scheme, 'border')}
            />
            <Polyline
              points={xy.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={hex(scheme, 'primary-text')}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {xy.map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={3.5} fill={hex(scheme, 'primary-text')} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row justify-between">
        <Text className="font-regular text-caption text-muted-foreground">{labels[0]}</Text>
        <Text className="font-regular text-caption text-muted-foreground">{labels[1]}</Text>
      </View>
    </View>
  );
}

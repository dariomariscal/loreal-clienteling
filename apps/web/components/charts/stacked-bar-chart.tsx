"use client";

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface StackedSeries {
  /** Key in each data row. */
  key: string;
  /** Display label in legend + tooltip. */
  label: string;
  /** CSS color (use semantic tokens or brand colors). */
  color: string;
}

interface StackedBarChartProps {
  data: Array<Record<string, string | number>>;
  /** Key in data for the X-axis label. */
  xKey: string;
  /** Stacked series, drawn bottom-to-top in the order given. */
  series: StackedSeries[];
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  height?: number;
}

/**
 * Stacked bar — composition by category inside each time bucket. The
 * appointments-by-day-by-status pattern: shows volume + share at a glance.
 */
export function StackedBarChart({
  data,
  xKey,
  series,
  xFormatter,
  yFormatter,
  height = 240,
}: StackedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormatter}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={yFormatter}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={
            yFormatter
              ? (v: any, name: any) => [yFormatter(Number(v)), String(name)]
              : undefined
          }
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          formatter={(value: string) => (
            <span style={{ color: "var(--color-muted-foreground)" }}>
              {value}
            </span>
          )}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={s.color}
            maxBarSize={40}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

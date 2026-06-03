"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  Tooltip,
} from "recharts";

interface SparklineProps {
  /** Array of numbers in chronological order. */
  data: number[];
  /** Visual tone — drives the line color. */
  tone?: "neutral" | "positive" | "negative";
  /** Height in px. Sparklines stay tiny on purpose. */
  height?: number;
  /** Optional formatter for the tooltip value. */
  formatter?: (value: number) => string;
  className?: string;
}

const TONE_COLOR: Record<NonNullable<SparklineProps["tone"]>, string> = {
  neutral: "var(--color-muted-foreground)",
  positive: "var(--color-success, oklch(0.52 0.17 150))",
  negative: "var(--color-destructive)",
};

/**
 * Mini line chart with no axes — Vercel/Linear pattern. Embedded in KPI cards
 * to show direction without stealing focus from the headline number.
 */
export function Sparkline({
  data,
  tone = "neutral",
  height = 28,
  formatter,
  className,
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        aria-hidden
        style={{ height }}
        className={className}
      />
    );
  }

  const series = data.map((value, index) => ({ index, value }));
  const color = TONE_COLOR[tone];

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              fontSize: "11px",
              padding: "4px 8px",
            }}
            formatter={(value: any) => [
              formatter ? formatter(Number(value)) : value,
              "",
            ]}
            labelFormatter={() => ""}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

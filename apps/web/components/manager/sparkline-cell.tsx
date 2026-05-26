"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineCellProps {
  data: { x: string; y: number }[];
  /** Tone follows the same semantic palette used by KpiSparklineCard. */
  tone?: "positive" | "negative" | "neutral";
  height?: number;
  width?: number;
}

/**
 * Compact 7–14 point sparkline meant to live inside a table cell.
 * Cleveland: line slopes encode trend more accurately than numbers alone.
 */
export function SparklineCell({
  data,
  tone = "neutral",
  height = 28,
  width = 80,
}: SparklineCellProps) {
  if (!data || data.length < 2) {
    return (
      <span
        className="inline-block h-px w-12 bg-muted-foreground/30 align-middle"
        aria-hidden
      />
    );
  }

  const stroke =
    tone === "positive"
      ? "var(--color-success, oklch(0.65 0.15 145))"
      : tone === "negative"
        ? "var(--color-destructive, oklch(0.62 0.20 25))"
        : "var(--muted-foreground)";

  return (
    <div style={{ width, height }} className="inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="y"
            stroke={stroke}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { ResponsiveContainer, Treemap as RechartsTreemap, Tooltip } from "recharts";

export interface TreemapDatum {
  id: string;
  name: string;
  value: number;
  /** Optional brand color (e.g. category color from L'Oréal). */
  color?: string;
}

interface TreemapProps {
  data: TreemapDatum[];
  /** Drill-down callback. */
  onItemClick?: (id: string) => void;
  /** Total height. */
  height?: number;
  /** Formatter for tooltips. */
  formatter?: (value: number) => string;
}

const FALLBACK_PALETTE = [
  "var(--color-foreground)",
  "color-mix(in oklch, var(--color-foreground) 75%, transparent)",
  "color-mix(in oklch, var(--color-foreground) 55%, transparent)",
  "color-mix(in oklch, var(--color-foreground) 40%, transparent)",
  "color-mix(in oklch, var(--color-foreground) 30%, transparent)",
  "color-mix(in oklch, var(--color-foreground) 22%, transparent)",
];

/**
 * Treemap for composition with many categories (≥4). Always preferred over a
 * 5+ slice donut. Cell area = value share.
 */
export function Treemap({
  data,
  onItemClick,
  height = 280,
  formatter = (n) => n.toLocaleString(),
}: TreemapProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const series = data.map((d, i) => ({
    ...d,
    fill: d.color ?? FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsTreemap
        data={series}
        dataKey="value"
        stroke="var(--color-background)"
        isAnimationActive={false}
        content={
          <TreemapCell
            onItemClick={onItemClick}
            total={total}
            formatter={formatter}
          />
        }
      >
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={(value: any) => [formatter(Number(value)), ""]}
        />
      </RechartsTreemap>
    </ResponsiveContainer>
  );
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  fill?: string;
  id?: string;
  onItemClick?: (id: string) => void;
  total: number;
  formatter: (n: number) => string;
}

function TreemapCell({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name,
  value,
  fill,
  id,
  onItemClick,
  total,
  formatter,
}: CellProps) {
  if (width < 1 || height < 1) return null;
  const sharePct = value != null ? Math.round((value / Math.max(total, 1)) * 100) : 0;
  const showLabels = width > 60 && height > 36;

  return (
    <g
      onClick={onItemClick && id ? () => onItemClick(id) : undefined}
      style={{ cursor: onItemClick ? "pointer" : "default" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={2}
      />
      {showLabels ? (
        <>
          <text
            x={x + 8}
            y={y + 18}
            fill="var(--color-background)"
            fontSize={12}
            fontWeight={500}
          >
            {truncate(name ?? "", Math.floor(width / 7))}
          </text>
          <text
            x={x + 8}
            y={y + 34}
            fill="var(--color-background)"
            fontSize={11}
            opacity={0.85}
          >
            {value != null ? formatter(value) : ""} · {sharePct}%
          </text>
        </>
      ) : null}
    </g>
  );
}

function truncate(s: string, len: number) {
  return s.length > len ? `${s.slice(0, Math.max(1, len - 1))}…` : s;
}

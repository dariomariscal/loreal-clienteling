"use client";

import { cn } from "@/lib/utils";

export interface HeatmapCell {
  /** X bucket — e.g. weekday code "mon". */
  x: string;
  /** Y bucket — e.g. hour "09". */
  y: string;
  /** Numeric intensity. Scaled vs the max in the dataset. */
  value: number;
}

interface HeatmapProps {
  data: HeatmapCell[];
  xLabels: { code: string; label: string }[];
  yLabels: { code: string; label: string }[];
  /** Formatter for cell tooltip / aria label. */
  formatter?: (value: number) => string;
  /** Optional click on a single cell. */
  onCellClick?: (cell: HeatmapCell) => void;
  className?: string;
}

/**
 * Day × hour heatmap — meant as a secondary visualization next to the main
 * "appointments by day" chart. Identifies dead hours / peak hours at a glance.
 *
 * Intensity scale: 0 (empty) → max in data (full). Single-hue so the eye reads
 * "more / less", not "good / bad" (which would need diverging colors).
 */
export function Heatmap({
  data,
  xLabels,
  yLabels,
  formatter = (n) => String(n),
  onCellClick,
  className,
}: HeatmapProps) {
  const max = Math.max(...data.map((c) => c.value), 1);
  const cellMap = new Map<string, HeatmapCell>();
  for (const cell of data) cellMap.set(`${cell.x}:${cell.y}`, cell);

  return (
    <div
      className={cn("inline-block overflow-x-auto", className)}
      role="table"
      aria-label="Mapa de calor"
    >
      <div className="grid" style={gridStyle(xLabels.length)}>
        {/* Top-left corner */}
        <div />
        {xLabels.map((x) => (
          <div
            key={x.code}
            className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {x.label}
          </div>
        ))}

        {yLabels.map((y) => (
          <YRow
            key={y.code}
            y={y}
            xLabels={xLabels}
            cellMap={cellMap}
            max={max}
            formatter={formatter}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  );
}

function gridStyle(xCount: number) {
  // First column reserved for Y labels.
  return {
    gridTemplateColumns: `auto repeat(${xCount}, minmax(28px, 1fr))`,
  } as const;
}

function YRow({
  y,
  xLabels,
  cellMap,
  max,
  formatter,
  onCellClick,
}: {
  y: { code: string; label: string };
  xLabels: { code: string; label: string }[];
  cellMap: Map<string, HeatmapCell>;
  max: number;
  formatter: (n: number) => string;
  onCellClick?: (cell: HeatmapCell) => void;
}) {
  return (
    <>
      <div className="pr-2 text-right text-[11px] tabular-nums text-muted-foreground">
        {y.label}
      </div>
      {xLabels.map((x) => {
        const cell = cellMap.get(`${x.code}:${y.code}`) ?? {
          x: x.code,
          y: y.code,
          value: 0,
        };
        const intensity = cell.value / max;
        const interactive = !!onCellClick && cell.value > 0;
        return (
          <button
            key={`${x.code}:${y.code}`}
            type="button"
            disabled={!interactive}
            onClick={interactive ? () => onCellClick!(cell) : undefined}
            aria-label={`${y.label} ${x.label}: ${formatter(cell.value)}`}
            className={cn(
              "m-0.5 aspect-square rounded-sm border border-border/40",
              interactive && "hover:ring-2 hover:ring-ring/60",
              "transition-colors",
            )}
            style={{
              background:
                intensity > 0
                  ? `color-mix(in oklch, var(--color-foreground) ${Math.round(
                      intensity * 80,
                    )}%, var(--color-muted))`
                  : "var(--color-muted)",
            }}
            title={`${y.label} ${x.label}: ${formatter(cell.value)}`}
          />
        );
      })}
    </>
  );
}

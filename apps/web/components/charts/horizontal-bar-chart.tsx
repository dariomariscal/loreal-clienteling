"use client";

import { cn } from "@/lib/utils";

export interface RankingDatum {
  /** Stable identifier — what onItemClick receives. */
  id: string;
  /** Visible label on the left. */
  label: string;
  /** Numeric value driving the bar length. */
  value: number;
  /** Optional delta vs prior period as a fraction (0.14 = +14%). */
  delta?: number | null;
  /** Optional brand color override (e.g. Lancôme gold). */
  color?: string;
}

interface HorizontalBarChartProps {
  data: RankingDatum[];
  /** Number formatter applied to each row's value. */
  formatter?: (value: number) => string;
  /** Drill-down callback. */
  onItemClick?: (id: string) => void;
  /** Max rows to render. Default 10 (Vercel convention). */
  limit?: number;
  className?: string;
}

/**
 * Horizontal bar ranking — the right element when labels are long (brand /
 * store / banner names). Beats vertical bars and pie charts for ranking >5
 * items. Each row shows label, bar, value, delta. Click drills down.
 */
export function HorizontalBarChart({
  data,
  formatter = (n) => n.toLocaleString(),
  onItemClick,
  limit = 10,
  className,
}: HorizontalBarChartProps) {
  if (data.length === 0) return null;

  const slice = data.slice(0, limit);
  const max = Math.max(...slice.map((d) => d.value), 1);

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {slice.map((row, index) => {
        const widthPct = (row.value / max) * 100;
        const deltaPct = row.delta != null ? Math.round(row.delta * 100) : null;
        const deltaTone =
          deltaPct == null
            ? null
            : Math.abs(deltaPct) < 1
              ? "neutral"
              : deltaPct > 0
                ? "up"
                : "down";

        const interactive = !!onItemClick;
        const Tag = interactive ? "button" : "div";

        return (
          <li key={row.id}>
            <Tag
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onItemClick!(row.id) : undefined}
              className={cn(
                "group grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                interactive &&
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              )}
            >
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {index + 1}
              </span>

              <span className="flex flex-col gap-1.5 min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {formatter(row.value)}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${widthPct}%`,
                      background: row.color ?? "var(--color-foreground)",
                    }}
                  />
                </span>
              </span>

              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  deltaTone === "up" && "text-[var(--color-success,oklch(0.52_0.17_150))]",
                  deltaTone === "down" && "text-destructive",
                  (deltaTone === "neutral" || deltaTone == null) &&
                    "text-muted-foreground",
                )}
              >
                {deltaPct == null
                  ? ""
                  : `${deltaPct > 0 ? "↗" : deltaPct < 0 ? "↘" : "→"} ${Math.abs(deltaPct)}%`}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

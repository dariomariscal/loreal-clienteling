"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { ArrowUpGlyph, ArrowDownGlyph } from "@/components/ui/glyphs";

export interface SparklinePoint {
  /** ISO date or any string — only used as a unique x value. */
  x: string;
  y: number;
}

interface KpiSparklineCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  /** Trailing series (typically 7–14 days). Drawn as a thin line. */
  series?: SparklinePoint[];
  /** Pre-computed delta vs the comparison period. Sign drives tone. */
  deltaPct?: number | null;
  /** Suffix shown in the delta chip ("vs ayer", "vs sem"). */
  deltaPeriod?: string;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Polaris-style metric card: number + sparkline + delta chip.
 * Three glance-able layers — recommended by NN/g for dashboards that have
 * 4–8 KPIs side-by-side. Touch target is the whole card (HIG 44pt+) so any
 * tap drills down to the metric detail.
 */
export function KpiSparklineCard({
  label,
  value,
  helper,
  series,
  deltaPct,
  deltaPeriod = "vs ayer",
  onClick,
  loading,
  className,
}: KpiSparklineCardProps) {
  const interactive = !!onClick;
  const hasSeries = (series?.length ?? 0) > 1;
  const direction =
    deltaPct == null
      ? "neutral"
      : deltaPct > 0
        ? "up"
        : deltaPct < 0
          ? "down"
          : "neutral";

  const lineColor =
    direction === "up"
      ? "var(--color-success, oklch(0.65 0.15 145))"
      : direction === "down"
        ? "var(--color-destructive, oklch(0.62 0.20 25))"
        : "var(--muted-foreground)";

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {deltaPct != null ? (
          <DeltaChip value={deltaPct} direction={direction} period={deltaPeriod} />
        ) : null}
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        {loading ? (
          <span className="block h-7 w-24 animate-pulse rounded-md bg-muted" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums leading-tight text-foreground">
            {value}
          </span>
        )}
        {helper ? (
          <span className="text-xs text-muted-foreground">{helper}</span>
        ) : null}
      </div>
      {hasSeries ? (
        <div className="mt-3 h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="y"
                stroke={lineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </>
  );

  const baseClassName = cn(
    "flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all duration-150",
    interactive &&
      "hover:-translate-y-px hover:shadow-sm hover:border-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    className,
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={baseClassName}>
        {content}
      </button>
    );
  }
  return <div className={baseClassName}>{content}</div>;
}

function DeltaChip({
  value,
  direction,
  period,
}: {
  value: number;
  direction: "up" | "down" | "neutral";
  period: string;
}) {
  const Icon =
    direction === "up"
      ? ArrowUpGlyph
      : direction === "down"
        ? ArrowDownGlyph
        : null;

  const tone =
    direction === "up"
      ? "text-success bg-success/10"
      : direction === "down"
        ? "text-destructive bg-destructive/10"
        : "text-muted-foreground bg-muted";

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        tone,
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      <span>{Math.abs(Math.round(value))}%</span>
      <span className="text-current/70">·{period.replace(/^vs /, "")}</span>
    </span>
  );
}

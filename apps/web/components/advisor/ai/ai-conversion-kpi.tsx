"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpGlyph, ArrowDownGlyph } from "@/components/ui/glyphs";
import { AISparkleChip } from "./ai-sparkle-chip";

interface Props {
  /** 0..1 conversion rate. */
  rate: number;
  /** Raw counts shown below the donut. */
  converted: number;
  total: number;
  /** Optional time-series 0..1 values for the sparkline (oldest → newest). */
  trend?: number[];
  /** Delta percent vs previous period for the chip. */
  deltaPct?: number | null;
  className?: string;
  loading?: boolean;
}

/**
 * KPI specifically for the engine's conversion rate. Visually distinct from
 * regular KpiCard:
 *  - SVG donut on the left (the "score")
 *  - AISparkleChip in the header to mark provenance
 *  - Sparkline at the bottom for trend at a glance
 *
 * Drop-in replacement for KpiCard inside the same grid: same border, same
 * radius, same padding — so the strip stays aligned even when the AI tile
 * is the only odd one out.
 */
export function AIConversionKpi({
  rate,
  converted,
  total,
  trend,
  deltaPct,
  className,
  loading,
}: Props) {
  const pct = Math.round(rate * 100);
  const safeTrend = (trend ?? []).filter((n) => Number.isFinite(n));

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[color:var(--ba-accent)]/25 bg-card p-4",
        "bg-gradient-to-br from-[color:var(--ba-accent-soft)]/40 to-transparent",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Conversión IA
        </span>
        <AISparkleChip size="sm" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Donut
          pct={pct}
          loading={loading}
          accent="var(--ba-accent)"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          {loading ? (
            <span className="block h-6 w-16 animate-pulse rounded-md bg-muted" />
          ) : (
            <span className="text-2xl font-semibold tabular-nums leading-tight text-foreground">
              {pct}%
            </span>
          )}
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {converted} de {total}
          </span>
          {typeof deltaPct === "number" ? <DeltaChip pct={deltaPct} /> : null}
        </div>
      </div>

      {safeTrend.length >= 2 ? (
        <Sparkline values={safeTrend} className="mt-3 h-7 w-full" />
      ) : null}
    </div>
  );
}

function Donut({
  pct,
  loading,
  accent,
}: {
  pct: number;
  loading?: boolean;
  accent: string;
}) {
  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className={cn("shrink-0", loading && "opacity-40")}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 600ms ease-out" }}
      />
    </svg>
  );
}

function DeltaChip({ pct }: { pct: number }) {
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "neutral";
  const Icon =
    direction === "up"
      ? ArrowUpGlyph
      : direction === "down"
        ? ArrowDownGlyph
        : null;
  const tone =
    direction === "up"
      ? "text-success"
      : direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        tone,
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      <span>{Math.abs(pct)}% vs mes ant.</span>
    </span>
  );
}

function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  // Normalise to a 100×30 viewBox so the SVG scales cleanly.
  const w = 100;
  const h = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      <polyline
        fill="none"
        stroke="var(--ba-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

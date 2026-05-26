"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowDownGlyph, ArrowUpGlyph } from "@/components/ui/glyphs";
import { formatCompactMoney } from "./format";
import { SparklineCell } from "./sparkline-cell";

export interface OutlierZone {
  zoneId: string;
  zoneName: string;
  /** Total sales of the period — used as the chip's primary value. */
  salesTotal: number;
  /** Delta vs the division average for the same metric, in percent. */
  deltaVsAvgPct: number | null;
  /** Optional sparkline series for the chip; falls back to a flat line. */
  series?: { x: string; y: number }[];
}

interface ZonesOutlierStripProps {
  zones: OutlierZone[];
  /** Where each chip links to. Receives the zone id, returns the href. */
  hrefFor?: (zoneId: string) => string;
  loading?: boolean;
  className?: string;
}

/**
 * Horizontal strip of zone "outlier chips" used in the NRM home. Each chip
 * exposes a single zone's sales total, a sparkline and a delta vs the
 * division average — answering the NRM's first daily question:
 *   "qué zonas se están separando de la media hoy?"
 *
 * Built on the same primitives the rest of `components/manager/` shares
 * (`SparklineCell`, `formatCompactMoney`, the up/down arrow glyphs) so the
 * visual vocabulary stays consistent with `RankingTable` / `KpiSparklineCard`.
 */
export function ZonesOutlierStrip({
  zones,
  hrefFor,
  loading,
  className,
}: ZonesOutlierStripProps) {
  if (loading) {
    return (
      <div className={cn("flex gap-3 overflow-x-auto", className)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[88px] w-[180px] shrink-0 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (zones.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
        className,
      )}
    >
      {zones.map((zone) => (
        <OutlierChip key={zone.zoneId} zone={zone} hrefFor={hrefFor} />
      ))}
    </div>
  );
}

function OutlierChip({
  zone,
  hrefFor,
}: {
  zone: OutlierZone;
  hrefFor?: (zoneId: string) => string;
}) {
  const direction: "up" | "down" | "neutral" =
    zone.deltaVsAvgPct == null
      ? "neutral"
      : zone.deltaVsAvgPct > 0
        ? "up"
        : zone.deltaVsAvgPct < 0
          ? "down"
          : "neutral";

  const tone =
    direction === "up"
      ? "text-success bg-success/10"
      : direction === "down"
        ? "text-destructive bg-destructive/10"
        : "text-muted-foreground bg-muted";

  const sparkTone =
    direction === "up" ? "positive" : direction === "down" ? "negative" : "neutral";

  const Icon =
    direction === "up"
      ? ArrowUpGlyph
      : direction === "down"
        ? ArrowDownGlyph
        : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {zone.zoneName}
        </p>
        {zone.deltaVsAvgPct != null ? (
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-medium tabular-nums",
              tone,
            )}
          >
            {Icon ? <Icon className="size-3" /> : null}
            {Math.abs(Math.round(zone.deltaVsAvgPct))}%
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tabular-nums text-foreground">
        {formatCompactMoney(zone.salesTotal)}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">vs promedio</span>
        <SparklineCell
          data={zone.series ?? []}
          tone={sparkTone}
          height={20}
          width={64}
        />
      </div>
    </>
  );

  const className =
    "flex h-[92px] w-[180px] shrink-0 flex-col rounded-xl border border-border bg-card p-3 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-sm hover:border-foreground/15";

  if (hrefFor) {
    return (
      <Link href={hrefFor(zone.zoneId)} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

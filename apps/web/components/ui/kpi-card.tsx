"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpGlyph, ArrowDownGlyph } from "@/components/ui/glyphs";

export type KpiDeltaDirection = "up" | "down" | "neutral";

interface KpiDelta {
  value: number;
  direction: KpiDeltaDirection;
  /** "mes" | "semana" | etc — appended as suffix in the chip. */
  period?: string;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  delta?: KpiDelta | null;
  onClick?: () => void;
  /** Cards in skeleton state render the layout without values. */
  loading?: boolean;
  className?: string;
}

/**
 * KPI card — header for the customer profile. Two visual states:
 *   - static (no onClick): a passive metric tile
 *   - actionable (onClick): same look but with hover lift + focus ring
 *
 * The delta chip is always positioned top-right and never wraps; the value
 * uses `tabular-nums` so a row of cards aligns digits across columns.
 */
export function KpiCard({
  label,
  value,
  helper,
  delta,
  onClick,
  loading,
  className,
}: KpiCardProps) {
  const interactive = !!onClick;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {delta ? <KpiDeltaChip delta={delta} /> : null}
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

function KpiDeltaChip({ delta }: { delta: KpiDelta }) {
  const { value, direction, period } = delta;
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
      <span>{Math.abs(value)}%</span>
      {period ? <span className="text-current/70">·{period}</span> : null}
    </span>
  );
}

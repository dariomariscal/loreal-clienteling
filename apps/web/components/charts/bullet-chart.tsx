"use client";

import { cn } from "@/lib/utils";

interface BulletChartProps {
  /** Current actual value (numerator). */
  actual: number;
  /** Goal / quota value (denominator). */
  target: number;
  /** Comparative value drawn as a tick mark — e.g. last period's actual. */
  reference?: number;
  /** Formatter applied to the value labels under the bar. */
  formatter?: (value: number) => string;
  /**
   * Optional band thresholds as fractions of `target`. Default Stephen Few
   * convention: 0.7 / 0.9 / 1.0 = poor / fair / good. The unfilled portion of
   * the bar shows these bands so the eye reads "where am I vs where I should be".
   */
  bands?: [number, number, number];
  className?: string;
}

/**
 * Horizontal bullet chart (Stephen Few). The brain reads bar length more
 * reliably than a gauge angle, so this is the default for "objetivo vs avance"
 * across the platform.
 *
 * Layout:
 *   ──────────────────────────────────────────  full = target
 *   ▓▓▓▓ poor   ▒▒▒▒ fair   ░░░░ good            ← background bands
 *   ████████████████████░░░░░░░░░░░░░░░░░░░░     ← actual (foreground)
 *                                  │             ← reference tick (optional)
 */
export function BulletChart({
  actual,
  target,
  reference,
  formatter = (n) => n.toLocaleString(),
  bands = [0.7, 0.9, 1.0],
  className,
}: BulletChartProps) {
  const safeTarget = target > 0 ? target : 1;
  const actualPct = Math.min(120, (actual / safeTarget) * 100);
  const referencePct =
    reference != null ? Math.min(120, (reference / safeTarget) * 100) : null;

  const [poor, fair] = bands;
  const poorPct = poor * 100;
  const fairPct = fair * 100;

  const attainmentPct = Math.round((actual / safeTarget) * 100);
  const onTrack = actual >= target * fair;

  return (
    <div className={cn("w-full", className)}>
      <div
        role="img"
        aria-label={`Avance ${attainmentPct}% del objetivo`}
        className="relative h-7 w-full overflow-hidden rounded-md bg-muted"
      >
        {/* Bands (subtle, only visible up to 100% of target) */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 bg-destructive/10"
          style={{ width: `${poorPct}%` }}
        />
        <div
          aria-hidden
          className="absolute inset-y-0 bg-[var(--color-warning,oklch(0.75_0.15_65))]/10"
          style={{ left: `${poorPct}%`, width: `${fairPct - poorPct}%` }}
        />
        <div
          aria-hidden
          className="absolute inset-y-0 bg-[var(--color-success,oklch(0.52_0.17_150))]/10"
          style={{ left: `${fairPct}%`, width: `${100 - fairPct}%` }}
        />

        {/* Actual fill */}
        <div
          className={cn(
            "absolute inset-y-1 left-0 rounded-sm transition-all duration-500 ease-out",
            onTrack
              ? "bg-[var(--color-success,oklch(0.52_0.17_150))]"
              : "bg-foreground",
          )}
          style={{ width: `${actualPct}%` }}
        />

        {/* Target marker at 100% */}
        <div
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/60"
          style={{ left: "100%" }}
        />

        {/* Reference tick */}
        {referencePct != null ? (
          <div
            aria-hidden
            className="absolute inset-y-1.5 w-0.5 rounded-full bg-foreground/40"
            style={{ left: `${referencePct}%` }}
          />
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium tabular-nums text-foreground">
          {formatter(actual)}
        </span>
        <span className="text-muted-foreground">
          de <span className="tabular-nums text-foreground">{formatter(target)}</span>
          <span className="ml-2 tabular-nums text-foreground">{attainmentPct}%</span>
        </span>
      </div>
    </div>
  );
}

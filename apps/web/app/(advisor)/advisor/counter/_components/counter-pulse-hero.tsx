"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import { cn } from "@/lib/utils";
import type { CounterTargetProgress } from "@/lib/hooks/use-sales-targets";

interface CounterPulseHeroProps {
  /** Today's progress against target. Null when no target is set. */
  target: CounterTargetProgress | null;
  /** Total sales of the day for the helper line below the bar. */
  totalSales: number;
  orderCount: number;
  currency?: string;
  loading?: boolean;
}

/**
 * The first thing the Counter Manager sees: today's sales vs daily target as a
 * thick horizontal progress bar. Color-coded by attainment so a glance from
 * across the counter is enough.
 *
 * Recommended by dashboard research (StepWell bullet chart pattern, Mercaux
 * KPI dashboard): progress bars convert better than gauges in retail.
 */
export function CounterPulseHero({
  target,
  totalSales,
  orderCount,
  currency = "MXN",
  loading,
}: CounterPulseHeroProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-muted" />
      </section>
    );
  }

  const targetAmount = target?.targetAmount ?? null;
  const attainmentPct = target?.attainmentPct;
  const actualAmount = target?.actualAmount ?? totalSales;
  const currencyCode = target?.currency ?? currency;

  // No target → show sales only.
  if (!target || targetAmount === null) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Venta de hoy
        </p>
        <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tabular-nums text-foreground">
          {formatMoney(actualAmount, currencyCode)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {orderCount} {orderCount === 1 ? "compra" : "compras"} · Sin objetivo definido
        </p>
      </section>
    );
  }

  const pct = attainmentPct ?? 0;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Venta de hoy · Objetivo
        </p>
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            pct >= 90
              ? "text-success"
              : pct >= 70
                ? "text-[var(--color-warning,oklch(0.75_0.15_65))]"
                : "text-destructive",
          )}
        >
          {pct}%
        </p>
      </div>
      <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tabular-nums text-foreground">
        {formatMoney(actualAmount, currencyCode)}{" "}
        <span className="text-xl font-normal text-muted-foreground">
          / {formatMoney(targetAmount, currencyCode)}
        </span>
      </p>
      <div className="mt-4">
        <ProgressBar
          value={pct}
          size="lg"
          ariaLabel={`Avance de ventas: ${pct}% del objetivo del día`}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {orderCount} {orderCount === 1 ? "compra" : "compras"} hoy
      </p>
    </section>
  );
}

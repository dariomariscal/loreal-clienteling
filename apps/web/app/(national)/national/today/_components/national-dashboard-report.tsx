"use client";

import { ReportShell, HeroCard, KpiStrip, ExportToolbar } from "@/components/reports";
import { NationalFilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/charts/sparkline";
import { AreaChart } from "@/components/charts/area-chart";
import {
  useFollowUpKPIs,
  useSalesTrend,
  useZoneOverview,
  useSalesTargetsAnalytics,
} from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * Report 1 — Executive dashboard for the National Retail Manager. Scope is
 * the division nationwide; the hero aggregates every counter the user can
 * see. Same primitives as the Area Manager version — only the filter bar
 * widens to include zone/banner.
 */
export function NationalDashboardReport() {
  const { filters } = useFilters();

  const { data: zone, isLoading: zoneLoading } = useZoneOverview(filters);
  const { data: targets } = useSalesTargetsAnalytics(filters);
  const { data: followUps, isLoading: fuLoading } = useFollowUpKPIs(filters);
  const { data: trend } = useSalesTrend("day", filters);

  const aggregate = aggregateTargets(targets?.data);
  const sparkPoints = trend?.data.map((d) => Number(d.totalAmount)) ?? [];

  return (
    <ReportShell
      title="Vista nacional"
      description="Avance agregado de tu división"
      filters={<NationalFilterBar />}
      toolbar={<ExportToolbar type="sales" />}
    >
      <HeroCard
        eyebrow="Objetivo de venta"
        title="Avance nacional"
        caption={
          aggregate.counters > 0
            ? `${aggregate.counters} mostradores en el alcance`
            : "Sin objetivos configurados"
        }
        target={aggregate.target}
        actual={zone?.sales.totalAmount ?? aggregate.actual}
        formatter={formatMoney}
      />

      <KpiStrip columns={4}>
        <KpiCard
          label="Sell-out"
          value={formatMoney(zone?.sales.totalAmount ?? 0)}
          loading={zoneLoading}
          helper={
            sparkPoints.length > 0 ? (
              <Sparkline data={sparkPoints} tone="positive" height={24} />
            ) : undefined
          }
        />
        <KpiCard
          label="Transacciones"
          value={zone?.sales.orderCount ?? 0}
          loading={zoneLoading}
          helper={
            zone
              ? `${formatTicket(zone.sales.totalAmount, zone.sales.orderCount)} ticket promedio`
              : undefined
          }
        />
        <KpiCard
          label="Registros nuevos"
          value={zone?.customers.newInPeriod ?? 0}
          loading={zoneLoading}
        />
        <KpiCard
          label="Seguimientos"
          value={followUps?.completed ?? 0}
          loading={fuLoading}
          helper={
            followUps
              ? `${followUps.overdue} vencidos · ${followUps.pending} pendientes`
              : undefined
          }
        />
      </KpiStrip>

      <section className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            Tendencia de venta
          </h2>
          <p className="text-xs text-muted-foreground">
            {trend?.data.length ?? 0} días en el período
          </p>
        </header>
        <AreaChart
          data={trend?.data ?? []}
          xKey="date"
          yKey="totalAmount"
          xFormatter={(d: string) =>
            new Date(d).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })
          }
          yFormatter={(v: number) => formatMoney(Number(v))}
          height={260}
        />
      </section>
    </ReportShell>
  );
}

type TargetRows = NonNullable<
  ReturnType<typeof useSalesTargetsAnalytics>["data"]
>["data"];

function aggregateTargets(rows: TargetRows | undefined) {
  if (!rows || rows.length === 0) return { target: 0, actual: 0, counters: 0 };
  let target = 0;
  let actual = 0;
  for (const r of rows) {
    target += r.target;
    actual += r.actual;
  }
  return { target, actual, counters: rows.length };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTicket(total: number, orders: number) {
  if (orders <= 0) return "—";
  return formatMoney(total / orders);
}

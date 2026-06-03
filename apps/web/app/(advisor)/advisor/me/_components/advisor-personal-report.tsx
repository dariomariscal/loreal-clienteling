"use client";

import { ReportShell, KpiStrip } from "@/components/reports";
import { FilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/charts/sparkline";
import { AreaChart } from "@/components/charts/area-chart";
import {
  useDashboardMetrics,
  useFollowUpKPIs,
  useSalesTrend,
} from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * BA's personal scorecard — the BA's view of "Report 6: BA performance"
 * applied to themselves. Backend automatically scopes every metric to the
 * caller. Single-card-strip + trend; no team table (BA doesn't see peers).
 */
export function AdvisorPersonalReport() {
  const { filters } = useFilters();
  const { from, to } = filters;

  const { data: metrics, isLoading } = useDashboardMetrics(from, to);
  const { data: followUps, isLoading: fuLoading } = useFollowUpKPIs(from, to);
  const { data: trend } = useSalesTrend("day", from, to);

  const totalSales = Number(metrics?.sales.totalAmount ?? 0);
  const sparkPoints = trend?.data.map((d) => Number(d.totalAmount)) ?? [];

  return (
    <ReportShell
      title="Mi desempeño"
      description="Tu propio scorecard en el período"
      filters={<FilterBar role="beauty_advisor" />}
    >
      <KpiStrip columns={4}>
        <KpiCard
          label="Mi venta atribuida"
          value={formatMoney(totalSales)}
          loading={isLoading}
          helper={
            sparkPoints.length > 0 ? (
              <Sparkline data={sparkPoints} tone="positive" height={24} />
            ) : undefined
          }
        />
        <KpiCard
          label="Transacciones"
          value={metrics?.sales.orderCount ?? 0}
          loading={isLoading}
        />
        <KpiCard
          label="Registros nuevos"
          value={metrics?.newCustomers ?? 0}
          loading={isLoading}
          helper="Clientas que registré"
        />
        <KpiCard
          label="Seguimientos completados"
          value={followUps?.completed ?? 0}
          loading={fuLoading}
          helper={
            followUps && followUps.overdue > 0
              ? `${followUps.overdue} vencidos por atender`
              : "Estás al día"
          }
        />
      </KpiStrip>

      <section className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            Mi tendencia de venta
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

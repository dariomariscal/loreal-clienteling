"use client";

import { ReportShell, HeroCard, KpiStrip, ExportToolbar } from "@/components/reports";
import { FilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/charts/sparkline";
import { AreaChart } from "@/components/charts/area-chart";
import {
  useDashboardMetrics,
  useFollowUpKPIs,
  useSalesTargetsAnalytics,
  useSalesTrend,
} from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * Report 1 — Executive store dashboard for the Counter Manager.
 *
 * Layout follows the constitution:
 *   ReportShell
 *     ├─ FilterBar (date only — counter scope is fixed by backend)
 *     ├─ HeroCard with BulletChart (objetivo de venta vs avance)
 *     ├─ KpiStrip (sell-out, transacciones, registros nuevos, seguimientos)
 *     └─ AreaChart (sales trend)
 */
export function CounterDashboardReport() {
  const { filters } = useFilters();

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(filters);
  const { data: targets, isLoading: targetsLoading } =
    useSalesTargetsAnalytics(filters);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUpKPIs(filters);
  const { data: trend } = useSalesTrend("day", filters);

  const counterTarget = targets?.data[0]; // CM scope returns single row
  const totalSales = Number(metrics?.sales.totalAmount ?? 0);
  const target = counterTarget?.target ?? 0;
  const sparkPoints = trend?.data.map((d) => Number(d.totalAmount)) ?? [];

  return (
    <ReportShell
      title="Dashboard ejecutivo"
      description="Avance del mostrador en el período seleccionado"
      filters={<FilterBar role="counter_manager" />}
      toolbar={<ExportToolbar type="sales" />}
    >
      <HeroCard
        eyebrow="Objetivo de venta"
        title={
          counterTarget
            ? `${counterTarget.storeName ?? "Mostrador"} · ${counterTarget.brandName ?? ""}`
            : "Objetivo de venta"
        }
        caption={
          counterTarget
            ? `${counterTarget.periodKind === "monthly" ? "Objetivo mensual" : "Objetivo del período"}`
            : "Sin objetivo configurado para el período"
        }
        target={target}
        actual={totalSales}
        formatter={formatMoney}
      />

      <KpiStrip columns={4}>
        <KpiCard
          label="Sell-out"
          value={formatMoney(totalSales)}
          loading={metricsLoading}
          helper={
            sparkPoints.length > 0 ? (
              <Sparkline data={sparkPoints} tone="positive" height={24} />
            ) : undefined
          }
        />
        <KpiCard
          label="Transacciones"
          value={metrics?.sales.orderCount ?? 0}
          loading={metricsLoading}
          helper={
            metrics
              ? `${formatTicket(totalSales, metrics.sales.orderCount)} ticket promedio`
              : undefined
          }
        />
        <KpiCard
          label="Registros nuevos"
          value={metrics?.newCustomers ?? 0}
          loading={metricsLoading}
          helper="Clientas registradas en el período"
        />
        <KpiCard
          label="Seguimientos"
          value={followUps?.completed ?? 0}
          loading={followUpsLoading}
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

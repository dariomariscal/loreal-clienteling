"use client";

import * as React from "react";
import { ReportShell, KpiStrip } from "@/components/reports";
import { NationalFilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  HorizontalBarChart,
  type RankingDatum,
} from "@/components/charts/horizontal-bar-chart";
import { useZonesRanking } from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * Cross-zone comparison for the National Retail Manager. Ranks the zones in
 * the user's division by sell-out, with new-customers and recommendation
 * conversion as secondary metrics.
 */
export function NationalZonesReport() {
  const { filters, setFilter } = useFilters();

  const { data, isLoading } = useZonesRanking(filters);

  const rows = React.useMemo<RankingDatum[]>(
    () =>
      data?.data.map((z) => ({
        id: z.zoneId,
        label: z.zoneName,
        value: z.sales.totalAmount,
      })) ?? [],
    [data],
  );

  const topZone = data?.data[0];
  const totalSales = data?.data.reduce((sum, z) => sum + z.sales.totalAmount, 0) ?? 0;
  const totalStores = data?.data.reduce((sum, z) => sum + z.storeCount, 0) ?? 0;

  return (
    <ReportShell
      title="Zonas"
      description="Comparativa entre zonas de tu división"
      filters={<NationalFilterBar />}
    >
      <KpiStrip columns={3}>
        <KpiCard
          label="Mejor zona"
          value={topZone?.zoneName ?? "—"}
          loading={isLoading}
          helper={topZone ? formatMoney(topZone.sales.totalAmount) : undefined}
        />
        <KpiCard
          label="Zonas activas"
          value={data?.data.length ?? 0}
          loading={isLoading}
          helper={`${totalStores} tiendas totales`}
        />
        <KpiCard
          label="Sell-out total"
          value={formatMoney(totalSales)}
          loading={isLoading}
        />
      </KpiStrip>

      <section className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            Ranking de zonas
          </h2>
          <p className="text-xs text-muted-foreground">
            Click una zona para filtrar el resto de los reportes
          </p>
        </header>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sin zonas con venta en el período.
          </p>
        ) : (
          <HorizontalBarChart
            data={rows}
            formatter={formatMoney}
            onItemClick={(id) => setFilter("zoneId", id)}
          />
        )}
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

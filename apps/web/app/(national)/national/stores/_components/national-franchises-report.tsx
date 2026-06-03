"use client";

import * as React from "react";
import { ReportShell, KpiStrip, ExportToolbar } from "@/components/reports";
import { NationalFilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  HorizontalBarChart,
  type RankingDatum,
} from "@/components/charts/horizontal-bar-chart";
import { Treemap, type TreemapDatum } from "@/components/charts/treemap";
import {
  useBannersRanking,
  useSalesBreakdown,
} from "@/lib/hooks/use-analytics";
import { useBrands } from "@/lib/hooks/use-brands";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * Report 5 — Top Franquicias/Marcas/Categorías for the NRM.
 * Same charts as the Area Manager version; scope widens to the whole division.
 */
export function NationalFranchisesReport() {
  const { filters, setFilter } = useFilters();

  const { data: banners, isLoading: bannersLoading } = useBannersRanking(filters);
  const { data: brandsBreakdown } = useSalesBreakdown("brand", filters);
  const { data: categoryBreakdown } = useSalesBreakdown("category", filters);
  const { data: brands } = useBrands();

  const brandName = React.useCallback(
    (id: string) => brands?.find((b) => b.id === id)?.displayName ?? id,
    [brands],
  );

  const bannerRows = React.useMemo<RankingDatum[]>(
    () =>
      banners?.data.map((b) => ({
        id: b.banner,
        label: b.bannerName,
        value: b.sales.totalAmount,
      })) ?? [],
    [banners],
  );

  const brandRows = React.useMemo<RankingDatum[]>(
    () =>
      brandsBreakdown?.data
        .filter((row) => Boolean(row.brandId))
        .map((row) => ({
          id: row.brandId!,
          label: brandName(row.brandId!),
          value: Number(row.totalAmount ?? 0),
        }))
        .sort((a, b) => b.value - a.value) ?? [],
    [brandsBreakdown, brandName],
  );

  const categoryRows = React.useMemo<TreemapDatum[]>(
    () =>
      categoryBreakdown?.data
        .filter((row) => Boolean(row.category))
        .map((row) => ({
          id: row.category!,
          name: humanizeCategory(row.category!),
          value: Number(row.totalAmount ?? 0),
        })) ?? [],
    [categoryBreakdown],
  );

  const topBanner = banners?.data[0];

  return (
    <ReportShell
      title="Top Franquicias y Marcas"
      description="Ranking nacional de tu división"
      filters={<NationalFilterBar />}
      toolbar={<ExportToolbar type="stores-ranking" />}
    >
      <KpiStrip columns={3}>
        <KpiCard
          label="Mejor franquicia"
          value={topBanner?.bannerName ?? "—"}
          loading={bannersLoading}
          helper={
            topBanner ? formatMoney(topBanner.sales.totalAmount) : undefined
          }
        />
        <KpiCard
          label="Franquicias activas"
          value={banners?.data.length ?? 0}
          loading={bannersLoading}
        />
        <KpiCard
          label="Marcas con venta"
          value={brandRows.length}
          loading={!brandsBreakdown}
        />
      </KpiStrip>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingCard
          title="Top Franquicias"
          description="Ranking por sell-out en el período"
          rows={bannerRows}
          onItemClick={(id) => setFilter("banner", id)}
        />
        <RankingCard
          title="Top Marcas"
          description="Ranking por sell-out en el período"
          rows={brandRows}
          onItemClick={(id) => setFilter("brandId", id)}
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            Ventas por categoría
          </h2>
          <p className="text-xs text-muted-foreground">
            {categoryRows.length} categorías
          </p>
        </header>
        {categoryRows.length > 0 ? (
          <Treemap data={categoryRows} formatter={formatMoney} height={280} />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sin ventas en el período.
          </p>
        )}
      </section>
    </ReportShell>
  );
}

function RankingCard({
  title,
  description,
  rows,
  onItemClick,
}: {
  title: string;
  description: string;
  rows: RankingDatum[];
  onItemClick: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin datos en el período.
        </p>
      ) : (
        <HorizontalBarChart
          data={rows}
          formatter={formatMoney}
          onItemClick={onItemClick}
        />
      )}
    </section>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function humanizeCategory(code: string): string {
  return code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

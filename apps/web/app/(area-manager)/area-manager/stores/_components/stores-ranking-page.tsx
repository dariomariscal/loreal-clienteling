"use client";

import { useMemo, useState } from "react";
import { subDays } from "date-fns";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { StoreGlyph } from "@/components/ui/glyphs";
import { useStoresRanking, type StoreRankingRow } from "@/lib/hooks/use-analytics";
import {
  RankingTable,
  BarInCell,
  type RankingColumn,
} from "@/components/manager/ranking-table";
import { formatCompactMoney } from "@/components/manager/format";

type RangePreset = "today" | "7d" | "30d";

const RANGE_LABEL: Record<RangePreset, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
};

function rangeToDates(range: RangePreset): { from: string; to: string } {
  const to = new Date();
  const from =
    range === "today"
      ? new Date(to.getFullYear(), to.getMonth(), to.getDate())
      : range === "7d"
        ? subDays(to, 7)
        : subDays(to, 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Ranking of every store in the area manager's zone, sortable by metric.
 * Cleveland-aligned: bar-in-cell + tabular-nums + sparkline column when we
 * have the data. Touch targets ≥56pt so iPad swipes don't fight taps.
 */
export function StoresRankingPage() {
  const [range, setRange] = useState<RangePreset>("7d");
  const { from, to } = useMemo(() => rangeToDates(range), [range]);
  const { data, isLoading } = useStoresRanking({ from, to });

  const rows = data?.data ?? [];

  const maxSales = useMemo(
    () => Math.max(1, ...rows.map((r) => r.sales.totalAmount)),
    [rows],
  );
  const maxOrders = useMemo(
    () => Math.max(1, ...rows.map((r) => r.sales.orderCount)),
    [rows],
  );

  const columns: RankingColumn<StoreRankingRow>[] = useMemo(
    () => [
      {
        key: "storeName",
        label: "Tienda",
        sortValue: (r) => r.storeName.charCodeAt(0),
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {r.storeName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {r.sales.uniqueCustomers > 0
                ? `${r.sales.uniqueCustomers} clientas`
                : "Sin clientas en el período"}
            </p>
          </div>
        ),
        className: "min-w-[180px] w-[28%]",
      },
      {
        key: "sales",
        label: "Ventas",
        align: "right",
        sortValue: (r) => r.sales.totalAmount,
        render: (r) => (
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-foreground">
              {formatCompactMoney(r.sales.totalAmount)}
            </span>
            <div className="w-24">
              <BarInCell value={r.sales.totalAmount} max={maxSales} />
            </div>
          </div>
        ),
      },
      {
        key: "orderCount",
        label: "Órdenes",
        align: "right",
        sortValue: (r) => r.sales.orderCount,
        render: (r) => (
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm tabular-nums text-foreground">
              {r.sales.orderCount}
            </span>
            <div className="w-20">
              <BarInCell value={r.sales.orderCount} max={maxOrders} />
            </div>
          </div>
        ),
      },
      {
        key: "avgTicket",
        label: "Ticket promedio",
        align: "right",
        sortValue: (r) => r.sales.avgTicket,
        render: (r) => (
          <span className="text-sm tabular-nums text-foreground">
            {formatCompactMoney(r.sales.avgTicket)}
          </span>
        ),
      },
      {
        key: "newCustomers",
        label: "Nuevas",
        align: "right",
        sortValue: (r) => r.newCustomers,
        render: (r) => (
          <span className="text-sm tabular-nums text-foreground">
            {r.newCustomers}
          </span>
        ),
      },
      {
        key: "conversion",
        label: "Conv. recos",
        align: "right",
        sortValue: (r) => r.recommendations.conversionPct ?? -1,
        render: (r) =>
          r.recommendations.conversionPct == null ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm tabular-nums text-foreground">
                {r.recommendations.conversionPct}%
              </span>
              <span className="text-xs text-muted-foreground">
                {r.recommendations.converted}/{r.recommendations.total}
              </span>
            </div>
          ),
      },
    ],
    [maxSales, maxOrders],
  );

  return (
    <SingleColumn>
      <div className="flex h-full w-full flex-col">
        <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
                Tiendas
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ranking comparativo · {rows.length}{" "}
                {rows.length === 1 ? "tienda" : "tiendas"} en la zona
              </p>
            </div>
            <RangeSelector value={range} onChange={setRange} />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <RankingTable
                rows={rows}
                columns={columns}
                getRowKey={(r) => r.storeId}
                defaultSortKey="sales"
                spotlightTop={2}
                stickyFirstColumn
                emptyIcon={<StoreGlyph className="size-6" />}
                emptyTitle="Sin actividad en el período"
                emptyDescription="Cambia el rango o vuelve cuando haya ventas en la zona."
                loading={isLoading}
                loadingRows={6}
              />
            </div>
          </div>
        </div>
      </div>
    </SingleColumn>
  );
}

function RangeSelector({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Rango de tiempo"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {(Object.keys(RANGE_LABEL) as RangePreset[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={
              active
                ? "rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
                : "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
            }
          >
            {RANGE_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

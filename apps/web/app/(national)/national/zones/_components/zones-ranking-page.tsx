"use client";

import { useMemo, useState } from "react";
import { subDays } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { Badge } from "@/components/ui/badge";
import { ZonesGlyph } from "@/components/ui/glyphs";
import {
  useStoresRanking,
  useZonesRanking,
  type ZoneRankingAggRow,
  type StoreRankingRow,
} from "@/lib/hooks/use-analytics";
import {
  RankingTable,
  BarInCell,
  type RankingColumn,
} from "@/components/manager/ranking-table";
import {
  SpotlightTop3,
  type SpotlightItem,
} from "@/components/manager/spotlight-top3";
import { formatCompactMoney } from "@/components/manager/format";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
 * Zone-level ranking across the NRM's division — the strategic step above
 * `/stores`. Hybrid pattern: SpotlightTop3 podium for the best three,
 * RankingTable for the long tail. Drill-down on row click opens a Sheet
 * that lists the stores of that zone (filtered client-side from
 * `useStoresRanking()`). The Sheet keeps the ranking context visible
 * behind it — the NRM never loses the cross-zone comparison while drilling.
 */
export function ZonesRankingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryZoneId = searchParams.get("zoneId");

  const [range, setRange] = useState<RangePreset>("7d");
  const { from, to } = useMemo(() => rangeToDates(range), [range]);

  const { data: zonesData, isLoading } = useZonesRanking(from, to);
  const { data: storesData } = useStoresRanking(from, to);

  const rows = zonesData?.data ?? [];
  const allStores = storesData?.data ?? [];

  const selected = useMemo(() => {
    if (!queryZoneId) return null;
    return rows.find((r) => r.zoneId === queryZoneId) ?? null;
  }, [queryZoneId, rows]);

  function openZone(zoneId: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("zoneId", zoneId);
    router.replace(`?${sp.toString()}`, { scroll: false });
  }

  function closeZone() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("zoneId");
    router.replace(sp.toString() ? `?${sp.toString()}` : "?", { scroll: false });
  }

  const maxSales = useMemo(
    () => Math.max(1, ...rows.map((r) => r.sales.totalAmount)),
    [rows],
  );

  const spotlightItems: SpotlightItem[] = useMemo(
    () =>
      rows.slice(0, 3).map((r) => ({
        id: r.zoneId,
        title: r.zoneName ?? r.zoneCode,
        subtitle: `${r.storeCount} ${r.storeCount === 1 ? "tienda" : "tiendas"}`,
        avatar: (
          <span className="flex size-12 items-center justify-center rounded-xl bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))] text-[color:var(--ba-accent)]">
            <ZonesGlyph className="size-6" />
          </span>
        ),
        primaryValue: formatCompactMoney(r.sales.totalAmount),
        primaryLabel: "Ventas",
        badge: (
          <Badge variant="outline" className="tabular-nums">
            {r.sales.orderCount} ord
          </Badge>
        ),
        onClick: () => openZone(r.zoneId),
      })),
    // openZone is stable enough (router/searchParams) — re-render on rows OK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );

  const columns: RankingColumn<ZoneRankingAggRow>[] = useMemo(
    () => [
      {
        key: "zoneName",
        label: "Zona",
        sortValue: (r) => (r.zoneName ?? r.zoneCode).charCodeAt(0),
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {r.zoneName ?? r.zoneCode}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {r.storeCount} {r.storeCount === 1 ? "tienda" : "tiendas"} ·{" "}
              {r.sales.uniqueCustomers > 0
                ? `${r.sales.uniqueCustomers} clientas`
                : "Sin clientas"}
            </p>
          </div>
        ),
        className: "min-w-[200px] w-[28%]",
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
            <div className="w-28">
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
          <span className="text-sm tabular-nums text-foreground">
            {r.sales.orderCount}
          </span>
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
    [maxSales],
  );

  return (
    <SingleColumn>
      <div className="flex h-full w-full flex-col">
        <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
                Zonas
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ranking comparativo cross-zona · {rows.length}{" "}
                {rows.length === 1 ? "zona" : "zonas"} en la división
              </p>
            </div>
            <RangeSelector value={range} onChange={setRange} />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6 lg:px-10">
            {spotlightItems.length > 0 || isLoading ? (
              <SpotlightTop3 items={spotlightItems} loading={isLoading} />
            ) : null}

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <RankingTable
                rows={rows}
                columns={columns}
                getRowKey={(r) => r.zoneId}
                defaultSortKey="sales"
                onRowClick={(r) => openZone(r.zoneId)}
                emptyIcon={<ZonesGlyph className="size-6" />}
                emptyTitle="Sin actividad en el período"
                emptyDescription="Cambia el rango o vuelve cuando haya ventas cross-zona."
                loading={isLoading}
                loadingRows={6}
              />
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && closeZone()}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>
              {selected?.zoneName ?? selected?.zoneCode ?? "Zona"}
            </SheetTitle>
          </SheetHeader>
          <SheetBody>
            {selected ? (
              <ZoneDetail
                zone={selected}
                stores={allStores.filter((s) => s.zoneId === selected.zoneId)}
              />
            ) : null}
          </SheetBody>
          <SheetFooter>
            <SheetClose>
              <Button variant="outline">Cerrar</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </SingleColumn>
  );
}

function ZoneDetail({
  zone,
  stores,
}: {
  zone: ZoneRankingAggRow;
  stores: StoreRankingRow[];
}) {
  const maxStoreSales = Math.max(
    1,
    ...stores.map((s) => s.sales.totalAmount),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <DetailMetric
          label="Ventas"
          value={formatCompactMoney(zone.sales.totalAmount)}
          helper={`${zone.sales.orderCount} órdenes`}
        />
        <DetailMetric
          label="Ticket promedio"
          value={formatCompactMoney(zone.sales.avgTicket)}
          helper={`${zone.sales.uniqueCustomers} clientas únicas`}
        />
        <DetailMetric
          label="Nuevas clientas"
          value={zone.newCustomers.toLocaleString("es-MX")}
          helper={`${zone.storeCount} ${zone.storeCount === 1 ? "tienda" : "tiendas"}`}
        />
        <DetailMetric
          label="Conv. recomendaciones"
          value={
            zone.recommendations.conversionPct != null
              ? `${zone.recommendations.conversionPct}%`
              : "—"
          }
          helper={`${zone.recommendations.converted}/${zone.recommendations.total}`}
        />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tiendas de la zona
        </p>
        {stores.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Sin datos por tienda en el período seleccionado.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {stores.map((s) => (
              <li
                key={s.storeId}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.storeName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.sales.orderCount} ord ·{" "}
                    {formatCompactMoney(s.sales.avgTicket)} ticket
                  </p>
                </div>
                <div className="w-24 shrink-0">
                  <BarInCell value={s.sales.totalAmount} max={maxStoreSales} />
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatCompactMoney(s.sales.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
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

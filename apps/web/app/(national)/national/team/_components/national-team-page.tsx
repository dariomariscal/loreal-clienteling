"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { subDays } from "date-fns";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { TeamGlyph, UserGlyph } from "@/components/ui/glyphs";
import {
  useCounterManagersRanking,
  useBaPerformance,
  type CounterManagerRankingRow,
  type BaPerformanceRow,
} from "@/lib/hooks/use-analytics";
import { useStores } from "@/lib/hooks/use-stores";
import { useZones } from "@/lib/hooks/use-zones";
import { useBrands } from "@/lib/hooks/use-brands";
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
  FacetedFilterChips,
  type Facet,
} from "@/components/manager/faceted-filter-chips";

type RangePreset = "today" | "7d" | "30d";
type TeamTab = "managers" | "bas";

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

export function NationalTeamPage() {
  const [tab, setTab] = useState<TeamTab>("managers");
  const [range, setRange] = useState<RangePreset>("7d");
  const { from, to } = useMemo(() => rangeToDates(range), [range]);

  const { data: zones } = useZones();
  const { data: brands } = useBrands();

  const facets: Facet[] = useMemo(
    () => [
      {
        key: "zone",
        label: "Zona",
        options: (zones ?? []).map((z) => ({
          value: z.id,
          label: z.displayName,
          hint: z.code,
        })),
      },
      {
        key: "brand",
        label: "Marca",
        options: (brands ?? []).map((b) => ({
          value: b.id,
          label: b.displayName,
        })),
      },
    ],
    [zones, brands],
  );

  return (
    <SingleColumn>
      <div className="flex h-full w-full flex-col">
        <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
          <div className="mx-auto w-full max-w-6xl space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
                  Equipo
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Counter Managers y Beauty Advisors de toda tu división
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TabSelector value={tab} onChange={setTab} />
                <RangeSelector value={range} onChange={setRange} />
              </div>
            </div>
            <FacetedFilterChips facets={facets} />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6 lg:px-10">
            {tab === "managers" ? (
              <ManagersView from={from} to={to} />
            ) : (
              <BasView from={from} to={to} />
            )}
          </div>
        </div>
      </div>
    </SingleColumn>
  );
}

// ── Counter Managers ───────────────────────────────────────────────────────

function ManagersView({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useCounterManagersRanking(from, to);
  const { data: stores } = useStores();
  const searchParams = useSearchParams();

  const rows = data?.data ?? [];

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores ?? []) map.set(s.id, s.displayName);
    return map;
  }, [stores]);

  const storeZoneById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const s of stores ?? []) map.set(s.id, s.zoneId);
    return map;
  }, [stores]);

  // URL facets → client-side filter.
  const filtered = useMemo(() => {
    const zoneFilter =
      searchParams.get("zone")?.split(",").filter(Boolean) ?? [];
    const brandFilter =
      searchParams.get("brand")?.split(",").filter(Boolean) ?? [];

    if (zoneFilter.length === 0 && brandFilter.length === 0) return rows;
    return rows.filter((r) => {
      if (zoneFilter.length > 0) {
        const z = r.storeId ? storeZoneById.get(r.storeId) : null;
        if (!z || !zoneFilter.includes(z)) return false;
      }
      if (brandFilter.length > 0 && !brandFilter.includes(r.brandId ?? "")) {
        return false;
      }
      return true;
    });
  }, [rows, storeZoneById, searchParams]);

  const maxSales = useMemo(
    () => Math.max(1, ...filtered.map((r) => r.sales.totalAmount)),
    [filtered],
  );

  const spotlightItems: SpotlightItem[] = useMemo(
    () =>
      filtered.slice(0, 3).map((r) => ({
        id: r.userId,
        title: r.fullName,
        subtitle: r.storeId
          ? (storeNameById.get(r.storeId) ?? "Tienda asignada")
          : "Sin tienda asignada",
        avatar: <CustomerAvatar firstName={r.fullName} size="lg" />,
        primaryValue: formatCompactMoney(r.sales.totalAmount),
        primaryLabel: "Ventas",
        badge: (
          <Badge variant="outline" className="tabular-nums">
            {r.sales.orderCount} ord
          </Badge>
        ),
      })),
    [filtered, storeNameById],
  );

  const columns: RankingColumn<CounterManagerRankingRow>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Counter Manager",
        sortValue: (r) => r.fullName.charCodeAt(0),
        render: (r) => (
          <div className="flex min-w-0 items-center gap-3">
            <CustomerAvatar firstName={r.fullName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {r.fullName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.storeId
                  ? (storeNameById.get(r.storeId) ?? "Tienda asignada")
                  : "Sin tienda"}
              </p>
            </div>
          </div>
        ),
        className: "min-w-[200px]",
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
          <span className="text-sm tabular-nums text-foreground">
            {r.sales.orderCount}
          </span>
        ),
      },
    ],
    [maxSales, storeNameById],
  );

  return (
    <>
      {spotlightItems.length > 0 || isLoading ? (
        <SpotlightTop3 items={spotlightItems} loading={isLoading} />
      ) : null}

      <SectionCard
        title={`Counter Managers (${filtered.length}${
          filtered.length !== rows.length ? ` / ${rows.length}` : ""
        })`}
      >
        <div className="overflow-hidden">
          <RankingTable
            rows={filtered}
            columns={columns}
            getRowKey={(r) => r.userId}
            defaultSortKey="sales"
            emptyIcon={<TeamGlyph className="size-6" />}
            emptyTitle="Sin actividad en el período"
            loading={isLoading}
          />
        </div>
      </SectionCard>
    </>
  );
}

// ── Beauty Advisors ────────────────────────────────────────────────────────

function BasView({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useBaPerformance(from, to);
  const { data: stores } = useStores();
  const searchParams = useSearchParams();

  const rows = data ?? [];

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores ?? []) map.set(s.id, s.displayName);
    return map;
  }, [stores]);

  const storeZoneById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const s of stores ?? []) map.set(s.id, s.zoneId);
    return map;
  }, [stores]);

  // BAs come unsorted — apply facet filter then sort.
  const filtered = useMemo(() => {
    const zoneFilter =
      searchParams.get("zone")?.split(",").filter(Boolean) ?? [];
    // BA performance rows don't expose brandId, so the brand facet is a
    // no-op here. Counter Managers still respect it in their view.
    return rows
      .filter((r) => {
        if (zoneFilter.length === 0) return true;
        const z = storeZoneById.get(r.storeId);
        return z != null && zoneFilter.includes(z);
      })
      .sort(
        (a, b) =>
          Number(b.sales.totalAmount ?? 0) - Number(a.sales.totalAmount ?? 0),
      );
  }, [rows, storeZoneById, searchParams]);

  const maxSales = useMemo(
    () =>
      Math.max(1, ...filtered.map((r) => Number(r.sales.totalAmount ?? 0))),
    [filtered],
  );

  const spotlightItems: SpotlightItem[] = useMemo(
    () =>
      filtered.slice(0, 3).map((r) => ({
        id: r.baId,
        title: r.fullName,
        subtitle: storeNameById.get(r.storeId) ?? "Beauty Advisor",
        avatar: <CustomerAvatar firstName={r.fullName} size="lg" />,
        primaryValue: formatCompactMoney(Number(r.sales.totalAmount ?? 0)),
        primaryLabel: "Ventas",
        badge: (
          <Badge variant="outline" className="tabular-nums">
            {Math.round(r.recommendations.conversionRate * 100)}% conv
          </Badge>
        ),
      })),
    [filtered, storeNameById],
  );

  const columns: RankingColumn<BaPerformanceRow>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Beauty Advisor",
        sortValue: (r) => r.fullName.charCodeAt(0),
        render: (r) => (
          <div className="flex min-w-0 items-center gap-3">
            <CustomerAvatar firstName={r.fullName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {r.fullName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {storeNameById.get(r.storeId) ?? "—"}
              </p>
            </div>
          </div>
        ),
        className: "min-w-[200px]",
      },
      {
        key: "sales",
        label: "Ventas",
        align: "right",
        sortValue: (r) => Number(r.sales.totalAmount ?? 0),
        render: (r) => (
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-foreground">
              {formatCompactMoney(Number(r.sales.totalAmount ?? 0))}
            </span>
            <div className="w-24">
              <BarInCell
                value={Number(r.sales.totalAmount ?? 0)}
                max={maxSales}
              />
            </div>
          </div>
        ),
      },
      {
        key: "recos",
        label: "Recos",
        align: "right",
        sortValue: (r) => r.recommendations.total,
        render: (r) => (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm tabular-nums text-foreground">
              {r.recommendations.converted}/{r.recommendations.total}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(r.recommendations.conversionRate * 100)}%
            </span>
          </div>
        ),
      },
      {
        key: "registrations",
        label: "Registros",
        align: "right",
        sortValue: (r) => r.registrations,
        render: (r) => (
          <span className="text-sm tabular-nums text-foreground">
            {r.registrations}
          </span>
        ),
      },
    ],
    [maxSales, storeNameById],
  );

  return (
    <>
      {spotlightItems.length > 0 || isLoading ? (
        <SpotlightTop3 items={spotlightItems} loading={isLoading} />
      ) : null}

      <SectionCard
        title={`Beauty Advisors (${filtered.length}${
          filtered.length !== rows.length ? ` / ${rows.length}` : ""
        })`}
      >
        <div className="overflow-hidden">
          <RankingTable
            rows={filtered}
            columns={columns}
            getRowKey={(r) => r.baId}
            defaultSortKey="sales"
            emptyIcon={<UserGlyph className="size-6" />}
            emptyTitle="Sin actividad de BAs en el período"
            loading={isLoading}
          />
        </div>
      </SectionCard>
    </>
  );
}

// ── Controls ───────────────────────────────────────────────────────────────

function TabSelector({
  value,
  onChange,
}: {
  value: TeamTab;
  onChange: (v: TeamTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de equipo"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      <TabButton active={value === "managers"} onClick={() => onChange("managers")}>
        Counter Managers
      </TabButton>
      <TabButton active={value === "bas"} onClick={() => onChange("bas")}>
        BAs
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
          : "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
      }
    >
      {children}
    </button>
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
      aria-label="Rango"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {(Object.keys(RANGE_LABEL) as RangePreset[]).map((key) => (
        <TabButton
          key={key}
          active={value === key}
          onClick={() => onChange(key)}
        >
          {RANGE_LABEL[key]}
        </TabButton>
      ))}
    </div>
  );
}

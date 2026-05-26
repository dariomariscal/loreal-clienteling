"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { Badge } from "@/components/ui/badge";
import {
  AppointmentGlyph,
  CheckCircleGlyph,
  PackageGlyph,
  StoreGlyph,
} from "@/components/ui/glyphs";
import { useZoneDashboardToday } from "@/lib/hooks/use-counter-dashboard";
import { useSalesTrend } from "@/lib/hooks/use-analytics";
import { KpiSparklineCard } from "@/components/manager/kpi-sparkline-card";
import {
  formatCompactMoney,
  formatCompactNumber,
} from "@/components/manager/format";

/**
 * Area Manager home — single-payload zone pulse for HOY.
 *
 * Tier-1 density: KPI cards with sparkline + delta on top, then a small
 * "tiendas críticas hoy" list pulled from the same zone payload. Refreshes
 * every minute via useZoneDashboardToday().
 *
 * Sparklines use the last 7 days of zone-level sales trend so each KPI has
 * temporal context without a second drilldown.
 */
export function AreaTodayPage() {
  const { data, isLoading } = useZoneDashboardToday();

  const today = new Date();
  const sevenDaysAgo = subDays(today, 6);
  const { data: trend } = useSalesTrend(
    "day",
    sevenDaysAgo.toISOString(),
    today.toISOString(),
  );

  const salesSeries = useMemo(
    () =>
      (trend?.data ?? []).map((p) => ({
        x: p.date,
        y: Number(p.totalAmount ?? 0),
      })),
    [trend],
  );

  const pulse = data?.pulse;
  const ranking = data?.ranking ?? [];
  const operations = data?.operations;
  const storeCount = data?.scope.storeCount ?? null;

  // Deltas vs first day in the 7-day series — gives a "vs hace 7 días" feel.
  const salesDelta = useMemo(() => {
    if (salesSeries.length < 2) return null;
    const first = salesSeries[0].y;
    const last = salesSeries[salesSeries.length - 1].y;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [salesSeries]);

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
              Mi zona hoy
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(today, "EEEE d 'de' MMMM", { locale: es })}
              {storeCount != null ? (
                <>
                  {" · "}
                  <span className="tabular-nums">{storeCount}</span> tiendas en
                  scope
                </>
              ) : null}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <PulseKpiGrid
            pulse={pulse}
            salesSeries={salesSeries}
            salesDelta={salesDelta}
            loading={isLoading}
          />

          <StoresCriticalCard ranking={ranking} loading={isLoading} />

          <UpcomingEventsCard
            events={operations?.upcomingEvents ?? []}
            loading={isLoading}
          />

          <OperationsCard
            pendingApprovals={operations?.pendingApprovalCount ?? 0}
            stockAlerts={operations?.stockAlertCount ?? 0}
            loading={isLoading}
          />
        </div>
      </div>
    </SingleColumn>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PulseKpiGrid({
  pulse,
  salesSeries,
  salesDelta,
  loading,
}: {
  pulse: ReturnType<typeof useZoneDashboardToday>["data"] extends infer T
    ? T extends { pulse: infer P }
      ? P
      : undefined
    : undefined;
  salesSeries: { x: string; y: number }[];
  salesDelta: number | null;
  loading?: boolean;
}) {
  const sales = pulse?.sales;
  const customers = pulse?.customers;
  const appts = pulse?.appointments;
  const recs = pulse?.recommendations;
  const samples = pulse?.samples;

  const apptCompletionPct = appts && appts.total > 0
    ? Math.round((appts.completed / appts.total) * 100)
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiSparklineCard
        label="Ventas hoy"
        value={formatCompactMoney(sales?.totalAmount ?? 0)}
        helper={`${formatCompactNumber(sales?.orderCount ?? 0)} compras`}
        series={salesSeries}
        deltaPct={salesDelta}
        deltaPeriod="vs sem"
        loading={loading}
      />
      <KpiSparklineCard
        label="Clientas atendidas"
        value={formatCompactNumber(sales?.uniqueCustomers ?? 0)}
        helper={`${formatCompactNumber(customers?.newInPeriod ?? 0)} nuevas`}
        loading={loading}
      />
      <KpiSparklineCard
        label="Recomendaciones"
        value={
          recs?.conversionPct != null
            ? `${recs.conversionPct}%`
            : recs
              ? `${recs.converted}/${recs.total}`
              : "—"
        }
        helper={
          recs
            ? `${recs.converted} convertidas de ${recs.total}`
            : "Sin recos"
        }
        loading={loading}
      />
      <KpiSparklineCard
        label="Citas"
        value={`${appts?.completed ?? 0}/${appts?.total ?? 0}`}
        helper={
          apptCompletionPct != null
            ? `${apptCompletionPct}% completadas · ${appts?.noShow ?? 0} no-shows`
            : `${appts?.noShow ?? 0} no-shows`
        }
        loading={loading}
      />
    </div>
  );
}

type RankingRow = NonNullable<
  ReturnType<typeof useZoneDashboardToday>["data"]
>["ranking"][number];

function StoresCriticalCard({
  ranking,
  loading,
}: {
  ranking: RankingRow[];
  loading?: boolean;
}) {
  // Show the top 3 best + bottom 3 worst stores. The order in `ranking`
  // already comes sales-desc from the API.
  const top3 = ranking.slice(0, 3);
  const bottom3 = ranking.slice(-3).reverse();
  const hasBoth = ranking.length > 6;

  return (
    <SectionCard
      title="Tiendas — hoy"
      action={
        <Link
          href="/area-manager/stores"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver ranking →
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-2 px-4 py-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : ranking.length === 0 ? (
        <AdvisorEmptyState
          icon={<StoreGlyph className="size-6" />}
          title="Sin actividad hoy"
        />
      ) : (
        <div className="px-4">
          <StoresPodium label="Mejor desempeño" rows={top3} tone="positive" />
          {hasBoth ? (
            <>
              <div className="my-3 border-t border-border" />
              <StoresPodium
                label="Requieren atención"
                rows={bottom3}
                tone="danger"
              />
            </>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function StoresPodium({
  label,
  rows,
  tone,
}: {
  label: string;
  rows: RankingRow[];
  tone: "positive" | "danger";
}) {
  const dotClass = tone === "positive" ? "bg-success" : "bg-destructive";
  return (
    <div className="py-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.storeId} className="flex items-center gap-3 py-2">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${dotClass}`}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {row.storeName}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatCompactMoney(row.sales.totalAmount)}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatCompactNumber(row.sales.orderCount)} ord
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type UpcomingEvent = NonNullable<
  ReturnType<typeof useZoneDashboardToday>["data"]
>["operations"]["upcomingEvents"][number];

function UpcomingEventsCard({
  events,
  loading,
}: {
  events: UpcomingEvent[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <SectionCard title="Próximos eventos">
        <div className="space-y-3 px-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (events.length === 0) {
    return (
      <SectionCard title="Próximos eventos">
        <AdvisorEmptyState
          icon={<AppointmentGlyph className="size-6" />}
          title="Sin eventos próximos en la zona"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Próximos eventos"
      action={
        <Link
          href="/area-manager/events"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver todos →
        </Link>
      }
    >
      <ul className="divide-y divide-border">
        {events.slice(0, 4).map((event) => (
          <li
            key={event.id}
            className="flex items-center gap-4 px-4 py-3"
          >
            <time className="w-28 shrink-0 font-mono text-xs tabular-nums text-foreground">
              {format(new Date(event.startTime), "d MMM HH:mm", { locale: es })}
            </time>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {event.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="capitalize">
                  {event.kind.replace("_", " ")}
                </span>
                {" · "}
                {event.storeName}
              </p>
            </div>
            {event.capacity ? (
              <Badge variant="outline" className="tabular-nums">
                cap {event.capacity}
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function OperationsCard({
  pendingApprovals,
  stockAlerts,
  loading,
}: {
  pendingApprovals: number;
  stockAlerts: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <SectionCard title="Operación">
        <div className="space-y-3 px-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Operación">
      <ul className="divide-y divide-border">
        <OperationsRow
          icon={<CheckCircleGlyph className="size-4" />}
          label="Aprobaciones pendientes en la zona"
          count={pendingApprovals}
          href="/area-manager/approvals"
          tone={pendingApprovals > 0 ? "warning" : "neutral"}
        />
        <OperationsRow
          icon={<PackageGlyph className="size-4" />}
          label="SKUs con stock bajo o agotado"
          count={stockAlerts}
          href="/area-manager/inventory"
          tone={stockAlerts > 0 ? "warning" : "neutral"}
        />
      </ul>
    </SectionCard>
  );
}

function OperationsRow({
  icon,
  label,
  count,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
  tone: "neutral" | "warning";
}) {
  return (
    <li className="px-4 py-3">
      <Link
        href={href}
        className="flex items-center gap-3 rounded-md transition-colors hover:bg-muted/40"
      >
        <span
          className={
            tone === "warning"
              ? "text-[var(--color-warning,oklch(0.75_0.15_65))]"
              : "text-[color:var(--ba-accent)]"
          }
        >
          {icon}
        </span>
        <span className="flex-1 text-sm text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {count}
        </span>
      </Link>
    </li>
  );
}

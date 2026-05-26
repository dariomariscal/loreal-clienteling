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
  ZonesGlyph,
} from "@/components/ui/glyphs";
import { useZoneDashboardToday } from "@/lib/hooks/use-counter-dashboard";
import { useSalesTrend } from "@/lib/hooks/use-analytics";
import { useZonesRanking } from "@/lib/hooks/use-analytics";
import { KpiSparklineCard } from "@/components/manager/kpi-sparkline-card";
import {
  formatCompactMoney,
  formatCompactNumber,
} from "@/components/manager/format";
import {
  ZonesOutlierStrip,
  type OutlierZone,
} from "@/components/manager/zones-outlier-strip";

/**
 * NRM home — single-payload national pulse for HOY.
 *
 * Anatomy:
 *   1. Greeting + scope line (number of zones + stores in the division).
 *   2. KPI grid (sales, customers, recos, appointments) with sparkline +
 *      delta vs yesterday. Reuses the same `KpiSparklineCard` the AM uses.
 *   3. Zones outlier strip — the differentiating panel for the NRM:
 *      horizontal chips of the zones that are diverging from the division
 *      average right now. Each chip links into /national/zones?zoneId=.
 *   4. Critical zones (top + bottom 3) ranking summary.
 *   5. Operations row: pending approvals + stock alerts.
 *
 * Refreshes every minute via useZoneDashboardToday().
 */
export function NationalTodayPage() {
  const { data, isLoading } = useZoneDashboardToday();

  const { today, fromIso, toIso } = useMemo(() => {
    const now = new Date();
    return {
      today: now,
      fromIso: subDays(now, 6).toISOString(),
      toIso: now.toISOString(),
    };
  }, []);
  const { data: trend } = useSalesTrend("day", fromIso, toIso);
  const { data: zonesRanking } = useZonesRanking(fromIso, toIso);

  const salesSeries = useMemo(
    () =>
      (trend?.data ?? []).map((p) => ({
        x: p.date,
        y: Number(p.totalAmount ?? 0),
      })),
    [trend],
  );

  const pulse = data?.pulse;
  const operations = data?.operations;
  const storeCount = data?.scope.storeCount ?? null;
  const zoneRows = zonesRanking?.data ?? [];

  // Delta vs first day in the 7-day series for the "vs sem" chip.
  const salesDelta = useMemo(() => {
    if (salesSeries.length < 2) return null;
    const first = salesSeries[0].y;
    const last = salesSeries[salesSeries.length - 1].y;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [salesSeries]);

  // Build the outlier strip: max 5 chips ordered by absolute delta vs
  // division average. That picks "loudest" zones — best + worst alike —
  // which is more useful at NRM scope than just the top 5.
  const outlierZones: OutlierZone[] = useMemo(() => {
    if (zoneRows.length === 0) return [];
    const avgSales =
      zoneRows.reduce((sum, z) => sum + z.sales.totalAmount, 0) / zoneRows.length;
    const enriched = zoneRows.map<OutlierZone>((z) => ({
      zoneId: z.zoneId,
      zoneName: z.zoneName ?? z.zoneCode ?? "Zona",
      salesTotal: z.sales.totalAmount,
      deltaVsAvgPct:
        avgSales > 0 ? ((z.sales.totalAmount - avgSales) / avgSales) * 100 : null,
    }));
    return [...enriched]
      .sort(
        (a, b) =>
          Math.abs(b.deltaVsAvgPct ?? 0) - Math.abs(a.deltaVsAvgPct ?? 0),
      )
      .slice(0, 5);
  }, [zoneRows]);

  const zoneCount = zoneRows.length;

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
              Vista nacional
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(today, "EEEE d 'de' MMMM", { locale: es })}
              {storeCount != null ? (
                <>
                  {" · "}
                  <span className="tabular-nums">{storeCount}</span> tiendas
                </>
              ) : null}
              {zoneCount > 0 ? (
                <>
                  {" · "}
                  <span className="tabular-nums">{zoneCount}</span>{" "}
                  {zoneCount === 1 ? "zona activa" : "zonas activas"}
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

          <OutlierSection
            zones={outlierZones}
            loading={isLoading || !zonesRanking}
          />

          <CriticalZonesCard rows={zoneRows} loading={!zonesRanking} />

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

  const apptCompletionPct =
    appts && appts.total > 0
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
          recs ? `${recs.converted} convertidas de ${recs.total}` : "Sin recos"
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

function OutlierSection({
  zones,
  loading,
}: {
  zones: OutlierZone[];
  loading: boolean;
}) {
  return (
    <SectionCard
      title="Zonas — fuera de la media"
      action={
        <Link
          href="/national/zones"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver ranking →
        </Link>
      }
    >
      <div className="px-4 py-4">
        {loading ? (
          <ZonesOutlierStrip zones={[]} loading />
        ) : zones.length === 0 ? (
          <AdvisorEmptyState
            icon={<ZonesGlyph className="size-6" />}
            title="Sin actividad cross-zona hoy"
            description="Vuelve cuando las zonas hayan registrado ventas en el período."
          />
        ) : (
          <ZonesOutlierStrip
            zones={zones}
            hrefFor={(id) => `/national/zones?zoneId=${id}`}
          />
        )}
      </div>
    </SectionCard>
  );
}

type ZoneRow = NonNullable<
  ReturnType<typeof useZonesRanking>["data"]
>["data"][number];

function CriticalZonesCard({
  rows,
  loading,
}: {
  rows: ZoneRow[];
  loading?: boolean;
}) {
  const top3 = rows.slice(0, 3);
  const bottom3 = rows.slice(-3).reverse();
  const hasBoth = rows.length > 6;

  return (
    <SectionCard
      title="Zonas — desempeño del período"
      action={
        <Link
          href="/national/zones"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver todas →
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-2 px-4 py-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdvisorEmptyState
          icon={<ZonesGlyph className="size-6" />}
          title="Sin actividad en el período"
        />
      ) : (
        <div className="px-4">
          <ZonesPodium label="Mejor desempeño" rows={top3} tone="positive" />
          {hasBoth ? (
            <>
              <div className="my-3 border-t border-border" />
              <ZonesPodium
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

function ZonesPodium({
  label,
  rows,
  tone,
}: {
  label: string;
  rows: ZoneRow[];
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
          <li key={row.zoneId} className="flex items-center gap-3 py-2">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${dotClass}`}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {row.zoneName ?? row.zoneCode}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {row.storeCount} {row.storeCount === 1 ? "tienda" : "tiendas"}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatCompactMoney(row.sales.totalAmount)}
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
          title="Sin eventos próximos en la división"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Próximos eventos"
      action={
        <Link
          href="/national/events"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver todos →
        </Link>
      }
    >
      <ul className="divide-y divide-border">
        {events.slice(0, 4).map((event) => (
          <li key={event.id} className="flex items-center gap-4 px-4 py-3">
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
          label="Aprobaciones pendientes en la división"
          count={pendingApprovals}
          href="/national/approvals"
          tone={pendingApprovals > 0 ? "warning" : "neutral"}
        />
        <OperationsRow
          icon={<PackageGlyph className="size-4" />}
          label="SKUs con stock bajo o agotado"
          count={stockAlerts}
          href="/national/inventory"
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

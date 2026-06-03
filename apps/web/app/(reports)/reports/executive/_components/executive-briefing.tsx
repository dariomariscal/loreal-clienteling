"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  useDashboardMetrics,
  useZoneOverview,
  useSalesTargetsAnalytics,
  useSalesTrend,
  useSalesBreakdown,
  useBannersRanking,
  useStoresRanking,
  useBaPerformance,
  useAppointmentMetrics,
  useFollowUpKPIs,
  useZoneHeatmap,
} from "@/lib/hooks/use-analytics";
import { useBrands } from "@/lib/hooks/use-brands";
import type { ReportFilters } from "@loreal/contracts";
import {
  BriefingSection,
  BriefingHeader,
  BriefingFooter,
  KpiHero,
  RankingTable,
  AttainmentRow,
  ActionBullet,
  SmallMultiple,
} from "./primitives";
import { GeoSection } from "./geo-section";

/* ============================================================================
   Executive briefing — 10 print-ready pages, NRM / Admin / Area Manager
   ============================================================================
   Lives at /reports/executive and is rendered by the same Next app as the
   dashboards. The "Descargar PDF" button on the dashboards opens this route
   in a new tab and triggers window.print() once the data has loaded.

   Filters come in via searchParams (from, to, banner, brandId, storeId,
   baUserId, zoneId) and are passed to every analytics hook so the brief
   reflects the exact slice the user was viewing.
   ============================================================================ */

function useFiltersFromSearchParams(): ReportFilters {
  const params = useSearchParams();
  return React.useMemo(
    () => ({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      banner: params.get("banner") ?? undefined,
      brandId: params.get("brandId") ?? undefined,
      storeId: params.get("storeId") ?? undefined,
      baUserId: params.get("baUserId") ?? undefined,
      zoneId: params.get("zoneId") ?? undefined,
    }),
    [params],
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCompactMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${Math.round(value)}`;
}

function formatPeriodLabel(from?: string, to?: string): string {
  if (!from && !to) return "";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (from && to) return `${fmt(from)} → ${fmt(to)}`;
  return from ? fmt(from) : fmt(to!);
}

function monthLabel(to?: string): string {
  const d = to ? new Date(to) : new Date();
  return d
    .toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

export interface ExecutiveBriefingProps {
  /** Who the brief is addressed to — printed on cover + footers. */
  recipientName?: string;
  /** Scope label ("Nacional", "Zona Centro", "Liverpool Polanco"). */
  scopeLabel: string;
}

export function ExecutiveBriefing({
  recipientName,
  scopeLabel,
}: ExecutiveBriefingProps) {
  const filters = useFiltersFromSearchParams();

  // Set after mount so SSR/CSR don't disagree on the "generated at" timestamp.
  const [generatedAt, setGeneratedAt] = React.useState<string>("");
  React.useEffect(() => {
    setGeneratedAt(new Date().toLocaleString("es-MX"));
  }, []);

  // ── Data loading ─────────────────────────────────────────────────
  const dashboard = useDashboardMetrics(filters);
  const zone = useZoneOverview(filters);
  const targets = useSalesTargetsAnalytics(filters);
  const trend = useSalesTrend("day", filters);
  const banners = useBannersRanking(filters);
  const stores = useStoresRanking({
    from: filters.from,
    to: filters.to,
    banner: filters.banner,
  });
  const performance = useBaPerformance(filters);
  const appointments = useAppointmentMetrics(filters);
  const followUps = useFollowUpKPIs(filters);
  const brandBreakdown = useSalesBreakdown("brand", filters);
  const categoryBreakdown = useSalesBreakdown("category", filters);
  const brands = useBrands();
  const heatmap = useZoneHeatmap(filters);

  const allLoaded =
    !dashboard.isLoading &&
    !zone.isLoading &&
    !trend.isLoading &&
    !banners.isLoading &&
    !stores.isLoading &&
    !performance.isLoading &&
    !appointments.isLoading;

  // ── Derived values ───────────────────────────────────────────────
  const totalSales = Number(dashboard.data?.sales.totalAmount ?? 0);
  const orderCount = dashboard.data?.sales.orderCount ?? 0;
  const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;
  const aggregateTarget =
    targets.data?.data.reduce((sum, t) => sum + t.target, 0) ?? 0;
  const targetAttainment =
    aggregateTarget > 0 ? totalSales / aggregateTarget : null;
  const trendSeries = trend.data?.data.map((d) => Number(d.totalAmount)) ?? [];
  const orderTrendSeries =
    trend.data?.data.map((d) => Number(d.orderCount ?? 0)) ?? [];

  // Quick MoM proxy: compare first vs last half of the trend series.
  const momDelta = computeHalfHalfDelta(trendSeries);

  const topStores = (stores.data?.data ?? []).slice(0, 10);
  const topBas = (performance.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(b.sales.totalAmount ?? 0) - Number(a.sales.totalAmount ?? 0),
    )
    .slice(0, 10);
  const topBanners = banners.data?.data ?? [];

  const brandRows =
    brandBreakdown.data?.data
      .filter((r) => r.brandId)
      .map((r) => ({
        brandId: r.brandId!,
        label:
          brands.data?.find((b) => b.id === r.brandId)?.displayName ??
          r.brandId!,
        amount: Number(r.totalAmount ?? 0),
        itemCount: r.itemCount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8) ?? [];

  const categoryRows =
    categoryBreakdown.data?.data
      .filter((r) => r.category)
      .map((r) => ({
        label: humanizeCategory(r.category!),
        amount: Number(r.totalAmount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount) ?? [];

  const periodLabel = formatPeriodLabel(filters.from, filters.to);
  const monthStr = monthLabel(filters.to);

  return (
    <div className="briefing-root min-h-screen pb-12">
      {/* ── Toolbar (screen only) ─────────────────────────────── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between border-b bg-white px-6 py-3 print:hidden"
        style={{ borderColor: "#E8E5DD" }}
        data-print-hide
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Vista previa
          </p>
          <p className="text-sm font-semibold text-neutral-900">
            Reporte Ejecutivo · {monthStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-sm border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!allLoaded}
            className="rounded-sm bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {allLoaded ? "Descargar PDF" : "Cargando…"}
          </button>
        </div>
      </div>

      {/* ── Page 1: Cover ─────────────────────────────────────── */}
      <CoverPage
        monthLabel={monthStr}
        periodLabel={periodLabel}
        scopeLabel={scopeLabel}
        recipientName={recipientName}
        generatedAt={generatedAt}
      />

      {/* ── Page 2: Executive summary ─────────────────────────── */}
      <BriefingSection
        index="01"
        eyebrow="Resumen Ejecutivo"
        title={summaryTitle({
          totalSales,
          targetAttainment,
          topBannerName: topBanners[0]?.bannerName,
          topBrandName: brandRows[0]?.label,
        })}
        caption={periodLabel}
      >
        <div className="grid grid-cols-1 gap-6">
          <ActionBullet
            tone={targetAttainment != null && targetAttainment >= 0.9 ? "positive" : "negative"}
            title={`Sell-out ${formatMoney(totalSales)} ${targetAttainment != null ? `(${(targetAttainment * 100).toFixed(0)}% del objetivo)` : ""}`}
            body={`${orderCount.toLocaleString("es-MX")} transacciones · ticket promedio ${formatMoney(avgTicket)} · ${dashboard.data?.newCustomers ?? 0} clientes nuevos en el período.`}
            badge={
              momDelta != null
                ? `${momDelta >= 0 ? "+" : ""}${(momDelta * 100).toFixed(1)}% MoM`
                : undefined
            }
          />
          {topBanners[0] ? (
            <ActionBullet
              tone="positive"
              title={`${topBanners[0].bannerName} lidera el sell-out con ${formatMoney(topBanners[0].sales.totalAmount)}`}
              body={`${topBanners[0].storeCount} tiendas activas · ${topBanners[0].sales.orderCount} pedidos · ticket promedio ${formatMoney(topBanners[0].sales.avgTicket)}.`}
            />
          ) : null}
          {brandRows[0] ? (
            <ActionBullet
              tone="neutral"
              title={`${brandRows[0].label} domina la categoría con ${formatMoney(brandRows[0].amount)} en ventas`}
              body={`${brandRows[0].itemCount.toLocaleString("es-MX")} unidades vendidas en el período. Top 3: ${brandRows.slice(0, 3).map((b) => b.label).join(" · ")}.`}
            />
          ) : null}
          {appointments.data ? (
            <ActionBullet
              tone={
                appointments.data.noShow / Math.max(appointments.data.total, 1) > 0.15
                  ? "negative"
                  : "positive"
              }
              title={`${appointments.data.total.toLocaleString("es-MX")} citas con ${((appointments.data.completed / Math.max(appointments.data.total, 1)) * 100).toFixed(0)}% completadas`}
              body={`No-show ${appointments.data.noShow} (${((appointments.data.noShow / Math.max(appointments.data.total, 1)) * 100).toFixed(0)}%) · Reagendadas ${appointments.data.rescheduled} · Canceladas ${appointments.data.cancelled}.`}
            />
          ) : null}
          {followUps.data ? (
            <ActionBullet
              tone={followUps.data.overdue > 0 ? "negative" : "positive"}
              title={`${followUps.data.completed} seguimientos completados${followUps.data.overdue > 0 ? `, ${followUps.data.overdue} vencidos` : ""}`}
              body={`Cumplimiento ${((followUps.data.completed / Math.max(followUps.data.total ?? followUps.data.completed + followUps.data.overdue, 1)) * 100).toFixed(0)}%. Atención inmediata a vencidos para evitar churn de clientes activos.`}
            />
          ) : null}
        </div>
      </BriefingSection>

      {/* ── Page 3: Hero KPIs ─────────────────────────────────── */}
      <BriefingSection
        index="02"
        eyebrow="KPIs Principales"
        title="Las métricas que importan a la dirección"
        caption={periodLabel}
      >
        <div className="grid grid-cols-3 gap-4">
          <KpiHero
            label="Sell-out total"
            value={formatCompactMoney(totalSales)}
            trend={trendSeries}
            deltaPct={momDelta ?? undefined}
            helper={
              targetAttainment != null
                ? `${(targetAttainment * 100).toFixed(0)}% del objetivo agregado`
                : undefined
            }
            accent
          />
          <KpiHero
            label="Transacciones"
            value={orderCount.toLocaleString("es-MX")}
            trend={orderTrendSeries}
            helper={`Ticket promedio ${formatMoney(avgTicket)}`}
          />
          <KpiHero
            label="Clientes nuevos"
            value={(dashboard.data?.newCustomers ?? 0).toLocaleString("es-MX")}
            helper={`${(dashboard.data?.totalCustomers ?? 0).toLocaleString("es-MX")} cartera total`}
          />
          <KpiHero
            label="Citas completadas"
            value={(appointments.data?.completed ?? 0).toLocaleString("es-MX")}
            helper={
              appointments.data
                ? `${((appointments.data.completed / Math.max(appointments.data.total, 1)) * 100).toFixed(0)}% del total reservadas`
                : undefined
            }
          />
          <KpiHero
            label="No-show"
            value={(appointments.data?.noShow ?? 0).toLocaleString("es-MX")}
            helper={
              appointments.data && appointments.data.total > 0
                ? `${((appointments.data.noShow / appointments.data.total) * 100).toFixed(1)}% tasa`
                : undefined
            }
          />
          <KpiHero
            label="Seguimientos vencidos"
            value={(followUps.data?.overdue ?? 0).toLocaleString("es-MX")}
            helper={
              followUps.data
                ? `${followUps.data.completed} completados en el período`
                : undefined
            }
          />
        </div>
      </BriefingSection>

      {/* ── Page 4: Sales by brand (small multiples) ──────────── */}
      {brandRows.length > 0 ? (
        <BriefingSection
          index="03"
          eyebrow="Ventas por Marca"
          title={
            brandRows[0]
              ? `${brandRows[0].label} concentra ${((brandRows[0].amount / Math.max(brandRows.reduce((s, r) => s + r.amount, 0), 1)) * 100).toFixed(0)}% de las ventas`
              : "Distribución por marca"
          }
          caption="Top 8 marcas en el período seleccionado"
        >
          <div className="grid grid-cols-4 gap-3">
            {brandRows.slice(0, 8).map((b) => (
              <SmallMultiple
                key={b.brandId}
                label={b.label}
                value={formatCompactMoney(b.amount)}
                trend={trendSeries}
              />
            ))}
          </div>
          <div className="mt-8">
            <h3
              className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em]"
              style={{ color: "#6B6B6B" }}
            >
              Ranking detallado
            </h3>
            <RankingTable
              rows={brandRows}
              rowKey={(r) => r.brandId}
              columns={[
                {
                  key: "label",
                  label: "Marca",
                  align: "left",
                  render: (r) => <span className="font-medium">{r.label}</span>,
                },
                {
                  key: "amount",
                  label: "Sell-out",
                  align: "right",
                  render: (r) => formatMoney(r.amount),
                  bar: (r) => ({ value: r.amount, max: brandRows[0]?.amount ?? 1 }),
                },
                {
                  key: "items",
                  label: "Unidades",
                  align: "right",
                  render: (r) => r.itemCount.toLocaleString("es-MX"),
                },
              ]}
            />
          </div>
        </BriefingSection>
      ) : null}

      {/* ── Page 5: Sales by franchise (bullet charts) ────────── */}
      {topBanners.length > 0 ? (
        <BriefingSection
          index="04"
          eyebrow="Ventas por Franquicia"
          title="Avance vs objetivo por franquicia"
          caption={`${topBanners.length} franquicias activas · objetivo agregado ${formatMoney(aggregateTarget)}`}
        >
          <div className="mt-2">
            {topBanners.map((b) => {
              const proportionalTarget =
                aggregateTarget > 0 && topBanners.length > 0
                  ? aggregateTarget *
                    (b.sales.totalAmount /
                      Math.max(
                        topBanners.reduce((s, x) => s + x.sales.totalAmount, 0),
                        1,
                      ))
                  : b.sales.totalAmount * 1.1;
              return (
                <AttainmentRow
                  key={b.banner}
                  label={b.bannerName}
                  actual={b.sales.totalAmount}
                  target={proportionalTarget}
                  formatter={formatCompactMoney}
                />
              );
            })}
          </div>
          {categoryRows.length > 0 ? (
            <div className="mt-10">
              <h3
                className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em]"
                style={{ color: "#6B6B6B" }}
              >
                Ventas por categoría
              </h3>
              <RankingTable
                rows={categoryRows.slice(0, 6)}
                rowKey={(r) => r.label}
                columns={[
                  {
                    key: "label",
                    label: "Categoría",
                    align: "left",
                    render: (r) => <span className="font-medium">{r.label}</span>,
                  },
                  {
                    key: "amount",
                    label: "Sell-out",
                    align: "right",
                    render: (r) => formatMoney(r.amount),
                    bar: (r) => ({
                      value: r.amount,
                      max: categoryRows[0]?.amount ?? 1,
                    }),
                  },
                ]}
              />
            </div>
          ) : null}
        </BriefingSection>
      ) : null}

      {/* ── Page 6: Top 10 stores ─────────────────────────────── */}
      {topStores.length > 0 ? (
        <BriefingSection
          index="05"
          eyebrow="Top 10 Tiendas"
          title={
            topStores[0]
              ? `${topStores[0].storeName} lidera con ${formatCompactMoney(topStores[0].sales.totalAmount)} en ventas`
              : "Ranking de tiendas"
          }
          caption="Ordenado por sell-out en el período"
        >
          <RankingTable
            rows={topStores}
            rowKey={(r) => r.storeId}
            columns={[
              {
                key: "store",
                label: "Tienda",
                align: "left",
                render: (r) => (
                  <div>
                    <div className="font-medium">{r.storeName}</div>
                    <div className="text-[10px] text-neutral-500">
                      {r.banner}
                    </div>
                  </div>
                ),
              },
              {
                key: "amount",
                label: "Sell-out",
                align: "right",
                render: (r) => formatMoney(r.sales.totalAmount),
                bar: (r) => ({
                  value: r.sales.totalAmount,
                  max: topStores[0]?.sales.totalAmount ?? 1,
                }),
              },
              {
                key: "orders",
                label: "Pedidos",
                align: "right",
                render: (r) => r.sales.orderCount.toLocaleString("es-MX"),
              },
              {
                key: "ticket",
                label: "Ticket prom.",
                align: "right",
                render: (r) => formatMoney(r.sales.avgTicket),
              },
              {
                key: "newCustomers",
                label: "Nuevos",
                align: "right",
                render: (r) => r.newCustomers.toLocaleString("es-MX"),
              },
            ]}
          />
        </BriefingSection>
      ) : null}

      {/* ── Page 7: Geographic distribution (Mapbox Static) ───── */}
      <GeoSection data={heatmap.data} isLoading={heatmap.isLoading} />

      {/* ── Page 8: Top BAs ───────────────────────────────────── */}
      {topBas.length > 0 ? (
        <BriefingSection
          index="07"
          eyebrow="Top Beauty Advisors"
          title={
            topBas[0]
              ? `${topBas[0].fullName ?? "—"} encabeza la zona con ${formatCompactMoney(Number(topBas[0].sales.totalAmount ?? 0))}`
              : "Desempeño individual"
          }
          caption="Ordenado por ventas atribuidas en el período"
        >
          <RankingTable
            rows={topBas}
            rowKey={(r) => r.baId}
            columns={[
              {
                key: "name",
                label: "Beauty Advisor",
                align: "left",
                render: (r) => (
                  <span className="font-medium">{r.fullName ?? "—"}</span>
                ),
              },
              {
                key: "sales",
                label: "Sell-out",
                align: "right",
                render: (r) => formatMoney(Number(r.sales.totalAmount ?? 0)),
                bar: (r) => ({
                  value: Number(r.sales.totalAmount ?? 0),
                  max: Number(topBas[0]?.sales.totalAmount ?? 1),
                }),
              },
              {
                key: "orders",
                label: "Trans.",
                align: "right",
                render: (r) => r.sales.orderCount.toLocaleString("es-MX"),
              },
              {
                key: "registrations",
                label: "Registros",
                align: "right",
                render: (r) => r.registrations.toLocaleString("es-MX"),
              },
              {
                key: "reco",
                label: "% Reco",
                align: "right",
                render: (r) =>
                  `${(r.recommendations.conversionRate * 100).toFixed(0)}%`,
              },
            ]}
          />
        </BriefingSection>
      ) : null}

      {/* ── Page 9: Appointments funnel ───────────────────────── */}
      {appointments.data ? (
        <BriefingSection
          index="08"
          eyebrow="Citas y Engagement"
          title={`${appointments.data.total} citas en el período · ${appointments.data.completed} completadas`}
          caption="Funnel completo desde reserva hasta servicio"
        >
          <div className="grid grid-cols-2 gap-6">
            <FunnelStage
              label="Reservadas"
              value={appointments.data.scheduled + appointments.data.confirmed}
              total={appointments.data.total}
            />
            <FunnelStage
              label="Confirmadas"
              value={appointments.data.confirmed}
              total={appointments.data.total}
            />
            <FunnelStage
              label="Completadas"
              value={appointments.data.completed}
              total={appointments.data.total}
            />
            <FunnelStage
              label="Reagendadas"
              value={appointments.data.rescheduled}
              total={appointments.data.total}
            />
            <FunnelStage
              label="Canceladas"
              value={appointments.data.cancelled}
              total={appointments.data.total}
              tone="negative"
            />
            <FunnelStage
              label="No-show"
              value={appointments.data.noShow}
              total={appointments.data.total}
              tone="negative"
            />
          </div>
        </BriefingSection>
      ) : null}

      {/* ── Page 10: Anomalies / things to watch ──────────────── */}
      <BriefingSection
        index="09"
        eyebrow="Atención"
        title="Lo que merece intervención esta semana"
        caption="Anomalías y oportunidades detectadas en los datos"
      >
        <div className="grid grid-cols-1 gap-6">
          {(followUps.data?.overdue ?? 0) > 0 ? (
            <ActionBullet
              tone="negative"
              title={`${followUps.data!.overdue} seguimientos vencidos sin atender`}
              body="Cada día sin contacto reduce la probabilidad de retención. Asignar a BAs en su próximo turno."
              badge="Acción inmediata"
            />
          ) : null}
          {appointments.data &&
          appointments.data.total > 0 &&
          appointments.data.noShow / appointments.data.total > 0.15 ? (
            <ActionBullet
              tone="negative"
              title={`Tasa de no-show ${((appointments.data.noShow / appointments.data.total) * 100).toFixed(0)}% — sobre el umbral del 15%`}
              body="Activar recordatorios automáticos 24h antes y confirmación 2h antes. Revisar tiendas con peor tasa en la tabla de tiendas."
            />
          ) : null}
          {topStores.length >= 3 ? (
            <ActionBullet
              tone="neutral"
              title={`Las 3 tiendas top generan ${(((topStores[0].sales.totalAmount + topStores[1].sales.totalAmount + topStores[2].sales.totalAmount) / Math.max(topStores.reduce((s, x) => s + x.sales.totalAmount, 0), 1)) * 100).toFixed(0)}% del sell-out`}
              body="Concentración alta. Replicar prácticas a las 7 tiendas restantes para diversificar riesgo."
            />
          ) : null}
          {targetAttainment != null && targetAttainment < 0.7 ? (
            <ActionBullet
              tone="negative"
              title={`Avance vs objetivo en ${(targetAttainment * 100).toFixed(0)}% — bajo umbral`}
              body="Revisar objetivos individuales por mostrador. Posible necesidad de ajuste de target o intervención de coaching."
            />
          ) : null}
          {(followUps.data?.overdue ?? 0) === 0 &&
          appointments.data &&
          appointments.data.noShow / Math.max(appointments.data.total, 1) <= 0.15 ? (
            <ActionBullet
              tone="positive"
              title="No se detectaron anomalías críticas en el período"
              body="Mantener cadencia operativa actual. Próxima revisión en el siguiente reporte mensual."
            />
          ) : null}
        </div>
      </BriefingSection>

      {/* ── Page 11: Appendix ─────────────────────────────────── */}
      <BriefingSection
        index="10"
        eyebrow="Anexo"
        title="Definiciones, fuentes y metodología"
        caption="Para consulta interna"
      >
        <dl className="grid grid-cols-1 gap-4 text-[11px]">
          {DEFINITIONS.map((def) => (
            <div
              key={def.term}
              className="briefing-no-break grid grid-cols-12 gap-4 border-t pt-3"
              style={{ borderColor: "#E8E5DD" }}
            >
              <dt className="col-span-3 font-semibold uppercase tracking-[0.1em] text-neutral-700">
                {def.term}
              </dt>
              <dd className="col-span-9 leading-relaxed text-neutral-600">
                {def.definition}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-[10px] text-neutral-500">
          Datos extraídos al {generatedAt || "…"} desde L'Oréal Clienteling.
          Período {periodLabel}. Filtros aplicados:{" "}
          {summarizeFilters(filters)}.
        </p>
      </BriefingSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function CoverPage({
  monthLabel,
  periodLabel,
  scopeLabel,
  recipientName,
  generatedAt,
}: {
  monthLabel: string;
  periodLabel: string;
  scopeLabel: string;
  recipientName?: string;
  generatedAt: string;
}) {
  return (
    <section className="briefing-page flex flex-col">
      <BriefingHeader monthLabel={monthLabel} scopeLabel={scopeLabel} />
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-500">
          Executive Briefing
        </p>
        <h1
          className="mt-4 text-[64px] font-semibold leading-[1.05] tracking-[-0.02em]"
          style={{ color: "#1A1A1A" }}
        >
          {monthLabel}
        </h1>
        <p
          className="mt-3 max-w-[40ch] text-[18px] leading-snug"
          style={{ color: "#6B6B6B" }}
        >
          Reporte mensual de desempeño · {scopeLabel}
        </p>
        <div className="mt-12 h-px w-24" style={{ background: "#E30613" }} />
        <div className="mt-6 grid grid-cols-3 gap-6 text-[11px]">
          <Meta label="Período" value={periodLabel || monthLabel} />
          <Meta label="Alcance" value={scopeLabel} />
          {recipientName ? (
            <Meta label="Para" value={recipientName} />
          ) : (
            <Meta label="Generado" value={generatedAt || "—"} />
          )}
        </div>
      </div>
      <BriefingFooter confidentialFor={recipientName} />
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function FunnelStage({
  label,
  value,
  total,
  tone = "neutral",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "neutral" | "negative";
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div
      className="briefing-no-break border p-4"
      style={{ borderColor: "#E8E5DD" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p
        className="mt-1 text-[28px] font-semibold tabular-nums tracking-[-0.01em]"
        style={{ color: tone === "negative" ? "#E30613" : "#1A1A1A" }}
      >
        {value.toLocaleString("es-MX")}
      </p>
      <p className="text-[11px] tabular-nums text-neutral-500">
        {pct.toFixed(1)}% del total
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden bg-neutral-100">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: tone === "negative" ? "#E30613" : "#1A1A1A",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function summaryTitle({
  totalSales,
  targetAttainment,
  topBannerName,
  topBrandName,
}: {
  totalSales: number;
  targetAttainment: number | null;
  topBannerName?: string;
  topBrandName?: string;
}): string {
  if (totalSales === 0) {
    return "Sin actividad de ventas registrada en el período seleccionado";
  }
  const parts: string[] = [];
  if (targetAttainment != null) {
    parts.push(
      `Avance ${(targetAttainment * 100).toFixed(0)}% del objetivo`,
    );
  }
  if (topBannerName) parts.push(`${topBannerName} a la cabeza`);
  if (topBrandName) parts.push(`${topBrandName} domina la categoría`);
  return parts.length > 0
    ? `${parts.join("; ")}.`
    : "Resumen del período seleccionado";
}

function computeHalfHalfDelta(series: number[]): number | null {
  if (series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const first = series.slice(0, half).reduce((s, x) => s + x, 0);
  const second = series.slice(half).reduce((s, x) => s + x, 0);
  if (first === 0) return null;
  return (second - first) / first;
}

function humanizeCategory(code: string): string {
  return code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function summarizeFilters(f: ReportFilters): string {
  const bits: string[] = [];
  if (f.banner) bits.push(`franquicia=${f.banner}`);
  if (f.brandId) bits.push(`marca=${f.brandId}`);
  if (f.storeId) bits.push(`tienda=${f.storeId}`);
  if (f.baUserId) bits.push(`BA=${f.baUserId}`);
  if (f.zoneId) bits.push(`zona=${f.zoneId}`);
  return bits.length === 0 ? "ninguno" : bits.join(", ");
}

const DEFINITIONS: { term: string; definition: string }[] = [
  {
    term: "Sell-out",
    definition:
      "Suma de los montos totales (incluyendo impuestos) de las órdenes procesadas en el período, atribuidas a las tiendas dentro del alcance del reporte.",
  },
  {
    term: "Ticket promedio",
    definition:
      "Sell-out total dividido entre el número de transacciones del período. No incluye órdenes vacías o canceladas.",
  },
  {
    term: "Atribución BA",
    definition:
      "Una orden se atribuye a un Beauty Advisor cuando hay vínculo directo (última consulta, link de seguimiento, cita) o cuando el BA registra al cliente. Conflictos cross-marca se resuelven a favor de la marca del BA.",
  },
  {
    term: "No-show",
    definition:
      "Cita con estado final 'no_show' — el cliente no se presentó ni reagendó. Umbral interno de alerta: 15%.",
  },
  {
    term: "% Conversión reco",
    definition:
      "Recomendaciones convertidas en venta dentro de los 30 días posteriores al registro, divididas entre el total de recomendaciones del período.",
  },
  {
    term: "Seguimiento vencido",
    definition:
      "Tarea de seguimiento (llamada / mensaje / cita propuesta) cuya fecha objetivo ya pasó y aún no se marca como completada ni descartada.",
  },
  {
    term: "MoM",
    definition:
      "Month-over-month. Comparativa del período actual contra el período inmediatamente anterior de igual duración.",
  },
];

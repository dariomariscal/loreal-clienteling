"use client";

import * as React from "react";
import {
  ReportSidePanel,
  useReportSidePanel,
} from "@/components/reports/report-side-panel";
import { useBaPerformance } from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * BA drill-down panel — opens when `?baUserId=xxx` is in the URL.
 * Reads the active filters (from/to) so the metrics shown match the report
 * the user clicked from. Reusable across counter / area / national reports.
 */
export function BaDetailPanel() {
  const { openId } = useReportSidePanel("baUserId");
  if (!openId) return null;
  return <BaDetailPanelBody baUserId={openId} />;
}

function BaDetailPanelBody({ baUserId }: { baUserId: string }) {
  const { filters } = useFilters();
  const { data, isLoading } = useBaPerformance(filters);
  const row = data?.find((r) => r.baId === baUserId);

  const title = isLoading ? "Cargando…" : row?.fullName ?? "Beauty Advisor";
  const description =
    row && filters.from && filters.to
      ? `Período ${formatDate(filters.from)} — ${formatDate(filters.to)}`
      : undefined;

  return (
    <ReportSidePanel paramName="baUserId" title={title} description={description}>
      {row ? <BaPanelContent row={row} /> : isLoading ? <Skeleton /> : <Empty />}
    </ReportSidePanel>
  );
}

function BaPanelContent({
  row,
}: {
  row: NonNullable<ReturnType<typeof useBaPerformance>["data"]>[number];
}) {
  return (
    <div className="flex flex-col gap-5 py-6">
      <section className="grid grid-cols-2 gap-3">
        <Stat
          label="Ventas"
          value={formatMoney(Number(row.sales.totalAmount))}
        />
        <Stat label="Transacciones" value={String(row.sales.orderCount)} />
        <Stat label="Registros" value={String(row.registrations)} />
        <Stat label="Mensajes" value={String(row.messagesSent)} />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recomendaciones
        </h3>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p className="text-foreground">
            <span className="text-2xl font-semibold tabular-nums">
              {row.recommendations.converted}
            </span>
            <span className="ml-2 text-muted-foreground">
              de {row.recommendations.total} convertidas
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tasa de conversión:{" "}
            {Math.round(row.recommendations.conversionRate * 100)}%
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Seguimientos
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total" value={String(row.followUps.total)} size="sm" />
          <Stat
            label="Completados"
            value={String(row.followUps.completed)}
            size="sm"
          />
          <Stat
            label="Vencidos"
            value={String(row.followUps.overdue)}
            size="sm"
            tone={row.followUps.overdue > 0 ? "warning" : "neutral"}
          />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  size = "md",
  tone = "neutral",
}: {
  label: string;
  value: string;
  size?: "sm" | "md";
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          size === "sm"
            ? `mt-1 text-base font-semibold tabular-nums ${
                tone === "warning"
                  ? "text-[var(--color-warning,oklch(0.75_0.15_65))]"
                  : "text-foreground"
              }`
            : "mt-1 text-lg font-semibold tabular-nums text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 py-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function Empty() {
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">
      Sin datos para este Beauty Advisor en el período.
    </p>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

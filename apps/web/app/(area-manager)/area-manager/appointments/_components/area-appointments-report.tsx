"use client";

import { ReportShell, HeroCard, KpiStrip } from "@/components/reports";
import { AreaManagerFilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import {
  useAppointmentMetrics,
  useAppointmentTargetsAnalytics,
} from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

const STATUS_SERIES = [
  { key: "scheduled", label: "Nuevas", color: "var(--color-foreground)" },
  {
    key: "rescheduled",
    label: "Reagendadas",
    color: "var(--color-warning, oklch(0.75 0.15 65))",
  },
  {
    key: "completed",
    label: "Completadas",
    color: "var(--color-success, oklch(0.52 0.17 150))",
  },
  {
    key: "noShow",
    label: "No-show",
    color: "color-mix(in oklch, var(--color-foreground) 25%, transparent)",
  },
];

/**
 * Report 2 — Appointment metrics for the Area Manager. Aggregates across the
 * zone's stores; targets sum is shown in the hero. Same primitives as the
 * Counter Manager version.
 */
export function AreaAppointmentsReport() {
  const { filters } = useFilters();

  const { data: metrics, isLoading: metricsLoading } = useAppointmentMetrics(filters);
  const { data: targets } = useAppointmentTargetsAnalytics(
    filters,
    "appointments_booked",
  );

  const aggregateTarget = targets?.data.reduce((sum, t) => sum + t.target, 0) ?? 0;
  const totalActual = metrics?.total ?? 0;

  return (
    <ReportShell
      title="Métricas de citas"
      description="Avance agregado de tu zona"
      filters={<AreaManagerFilterBar />}
    >
      <HeroCard
        eyebrow="Objetivo agregado"
        title="Citas reservadas"
        caption={
          targets?.data.length
            ? `${targets.data.length} objetivos activos en el período`
            : "Sin objetivos configurados"
        }
        target={aggregateTarget}
        actual={totalActual}
        formatter={(v) => `${Math.round(v)} citas`}
      />

      <KpiStrip columns={4}>
        <KpiCard
          label="Total citas"
          value={metrics?.total ?? 0}
          loading={metricsLoading}
        />
        <KpiCard
          label="Nuevas"
          value={(metrics?.scheduled ?? 0) + (metrics?.confirmed ?? 0)}
          loading={metricsLoading}
          helper="Programadas + confirmadas"
        />
        <KpiCard
          label="Reagendadas"
          value={metrics?.rescheduled ?? 0}
          loading={metricsLoading}
        />
        <KpiCard
          label="No-show"
          value={metrics?.noShow ?? 0}
          loading={metricsLoading}
          helper={
            metrics && metrics.total > 0
              ? `${Math.round((metrics.noShow / metrics.total) * 100)}% tasa`
              : undefined
          }
        />
      </KpiStrip>

      <section className="rounded-xl border border-border bg-card p-6">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            Distribución por estado
          </h2>
          <p className="text-xs text-muted-foreground">
            Citas en el período seleccionado
          </p>
        </header>
        <StackedBarChart
          data={[
            {
              bucket: "Período",
              scheduled:
                (metrics?.scheduled ?? 0) + (metrics?.confirmed ?? 0),
              rescheduled: metrics?.rescheduled ?? 0,
              completed: metrics?.completed ?? 0,
              noShow: metrics?.noShow ?? 0,
            },
          ]}
          xKey="bucket"
          series={STATUS_SERIES}
          height={220}
        />
      </section>
    </ReportShell>
  );
}

"use client";

import { ReportShell, HeroCard, KpiStrip, ExportToolbar } from "@/components/reports";
import { FilterBar } from "@/components/filters";
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
 * Report 2 — Appointment metrics for the Counter Manager.
 * Hero card shows weekly goal vs current pace; KPI strip breaks down statuses;
 * a stacked bar by day visualizes "new vs rescheduled vs completed vs no-show".
 */
export function CounterAppointmentsReport() {
  const { filters } = useFilters();

  const { data: metrics, isLoading: metricsLoading } = useAppointmentMetrics(filters);
  const { data: weeklyTargets } = useAppointmentTargetsAnalytics(
    filters,
    "appointments_booked",
  );

  const weeklyTarget = weeklyTargets?.data[0];
  const totalActual = metrics?.total ?? 0;
  const targetValue = weeklyTarget?.target ?? 0;

  // Synthetic distribution by day — backend will eventually provide this; for
  // now we render a simple aggregated bar so the visual is real once the
  // endpoint is hooked. KISS for the demo, Open/Closed for the future.
  const byDay = buildDailyDistribution(metrics);

  return (
    <ReportShell
      title="Métricas de citas"
      description="Objetivo semanal y desglose por estado"
      filters={<FilterBar role="counter_manager" />}
      toolbar={<ExportToolbar type="agenda-report" />}
    >
      <HeroCard
        eyebrow="Objetivo semanal"
        title="Citas reservadas"
        caption={
          weeklyTarget
            ? `Período ${weeklyTarget.periodStart} → ${weeklyTarget.periodEnd}`
            : "Sin objetivo semanal configurado"
        }
        target={targetValue}
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
          data={byDay as unknown as Array<Record<string, string | number>>}
          xKey="bucket"
          series={STATUS_SERIES}
          height={220}
        />
      </section>
    </ReportShell>
  );
}

interface DailyDatum {
  bucket: string;
  scheduled: number;
  rescheduled: number;
  completed: number;
  noShow: number;
}

function buildDailyDistribution(
  metrics: ReturnType<typeof useAppointmentMetrics>["data"] | undefined,
): DailyDatum[] {
  if (!metrics) return [];
  // Aggregated total broken down by status — single bucket "Período".
  // When the backend exposes per-day buckets the same chart will render N bars.
  return [
    {
      bucket: "Período",
      scheduled: (metrics.scheduled ?? 0) + (metrics.confirmed ?? 0),
      rescheduled: metrics.rescheduled ?? 0,
      completed: metrics.completed ?? 0,
      noShow: metrics.noShow ?? 0,
    },
  ];
}

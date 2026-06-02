"use client";

import { KpiCard } from "@/components/ui/kpi-card";
import type { AppointmentKpis } from "@loreal/contracts";

interface AppointmentKpiStripProps {
  kpis: AppointmentKpis;
  loading?: boolean;
}

/**
 * 4-card KPI strip for the appointment metrics page. Revenue per appointment
 * is intentionally the first card — it's the metric leadership cares about.
 */
export function AppointmentKpiStrip({
  kpis,
  loading,
}: AppointmentKpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard
        label="Revenue / cita"
        value={formatMoneyShort(kpis.revenuePerAppointment)}
        helper={`AAV ${formatMoneyShort(kpis.averageAppointmentValue)}`}
        loading={loading}
      />
      <KpiCard
        label="Tasa de asistencia"
        value={`${kpis.showRatePct}%`}
        helper={`${kpis.completed} llegaron / ${kpis.completed + kpis.noShow}`}
        loading={loading}
      />
      <KpiCard
        label="Conversión"
        value={`${kpis.conversionRatePct}%`}
        helper="Citas que cerraron venta"
        loading={loading}
      />
      <KpiCard
        label="Citas completadas"
        value={kpis.completed}
        helper={`de ${kpis.total} programadas`}
        loading={loading}
      />
    </div>
  );
}

function formatMoneyShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString("es-MX")}`;
}

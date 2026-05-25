"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { KpiCard, type KpiDeltaDirection } from "@/components/ui/kpi-card";
import { useCustomerMetrics } from "@/lib/hooks";

interface CustomerKpiCardsProps {
  customerId: string;
  /** Called when the "Próxima cita" card is clicked. */
  onOpenAppointments?: () => void;
}

/**
 * Strip of 4 KPI cards. Reads `/customers/:id/metrics` and degrades to a
 * skeleton on first load. Each card sticks to one job — no nested
 * sub-metrics. The "Próxima cita" card is the only actionable one in v1.
 */
export function CustomerKpiCards({
  customerId,
  onOpenAppointments,
}: CustomerKpiCardsProps) {
  const { data, isLoading } = useCustomerMetrics(customerId);

  const ltvDelta = React.useMemo(() => {
    if (!data || data.ltvChangePct === null) return null;
    const direction: KpiDeltaDirection =
      data.ltvChangePct > 0
        ? "up"
        : data.ltvChangePct < 0
          ? "down"
          : "neutral";
    return {
      value: data.ltvChangePct,
      direction,
      period: "mes",
    };
  }, [data]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="LTV"
        loading={isLoading}
        value={formatCurrency(data?.ltv ?? 0)}
        delta={ltvDelta}
      />
      <KpiCard
        label="Compras"
        loading={isLoading}
        value={data?.ordersCount ?? 0}
      />
      <KpiCard
        label="Citas"
        loading={isLoading}
        value={data?.appointmentCount ?? 0}
        helper={
          data?.nextAppointmentAt
            ? `Próxima ${formatRelativeAt(data.nextAppointmentAt)}`
            : "Sin próximas"
        }
        onClick={data?.nextAppointmentAt ? onOpenAppointments : undefined}
      />
      <KpiCard
        label="Última visita"
        loading={isLoading}
        value={data?.lastVisitAt ? formatRelativeShort(data.lastVisitAt) : "—"}
        helper={
          data?.lastVisitAt
            ? format(new Date(data.lastVisitAt), "d MMM yyyy", { locale: es })
            : undefined
        }
      />
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeAt(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

function formatRelativeShort(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} d`;
  if (days < 30) return `Hace ${Math.round(days / 7)} sem`;
  return format(d, "MMM yyyy", { locale: es });
}

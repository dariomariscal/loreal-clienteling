"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { KpiCard, type KpiDeltaDirection } from "@/components/ui/kpi-card";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import { useCustomerMetrics } from "@/lib/hooks";

interface Props {
  customerId: string;
  /** Called when the next-appointment KPI is tapped. */
  onOpenAppointments?: () => void;
}

/**
 * 4-card KPI strip for the advisor profile. Reads `/customers/:id/metrics`
 * and degrades to a skeleton on first load. Labels are written in
 * Beauty-Advisor voice — "Lo que ha gastado", not "LTV"; "Le toca volver",
 * not "Next appointment".
 */
export function CustomerKpiCards({ customerId, onOpenAppointments }: Props) {
  const { data, isLoading } = useCustomerMetrics(customerId);

  const ltvDelta = React.useMemo(() => {
    if (!data || data.ltvChangePct === null) return null;
    const direction: KpiDeltaDirection =
      data.ltvChangePct > 0 ? "up" : data.ltvChangePct < 0 ? "down" : "neutral";
    return { value: data.ltvChangePct, direction, period: "mes" };
  }, [data]);

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <KpiCard
        label="Lo que ha gastado"
        loading={isLoading}
        value={formatMoney(data?.ltv ?? 0)}
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
            ? `Le toca volver ${formatRelative(data.nextAppointmentAt)}`
            : "Sin próximas citas"
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

function formatRelative(iso: string): string {
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

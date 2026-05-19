"use client";

import { Badge } from "@/components/ui/badge";
import type { CalendarAppointment } from "@/lib/hooks";

export const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

export const STATUS_VARIANT: Record<
  string,
  "default" | "info" | "success" | "warning" | "destructive"
> = {
  scheduled: "default",
  confirmed: "info",
  rescheduled: "warning",
  cancelled: "destructive",
  completed: "success",
  no_show: "destructive",
};

const SEGMENT_LABEL: Record<string, string> = {
  new: "Nueva",
  returning: "Recurrente",
  vip: "VIP",
  at_risk: "En riesgo",
};

const SEGMENT_VARIANT: Record<
  string,
  "info" | "success" | "warning" | "destructive" | "secondary"
> = {
  new: "info",
  returning: "secondary",
  vip: "success",
  at_risk: "warning",
};

interface AppointmentCardProps {
  appointment: CalendarAppointment;
  onClick: () => void;
  showBa?: boolean;
}

export function AppointmentCard({
  appointment,
  onClick,
  showBa,
}: AppointmentCardProps) {
  const time = new Date(appointment.scheduledAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const eventLabel = appointment.eventTypeName ?? "Evento";
  const colorBar = appointment.eventTypeColor ?? "#6B6B6B";

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-border/50 bg-card text-left text-xs transition-all duration-200 hover:bg-muted/40 hover:shadow-sm"
    >
      <div className="flex">
        {/* Color bar from event type */}
        <div
          className="w-1 shrink-0 rounded-l-xl"
          style={{ backgroundColor: colorBar }}
        />

        <div className="flex-1 p-2">
          {/* Row 1: Time + Duration */}
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold tabular-nums">{time}</span>
            <span className="text-muted-foreground">
              {appointment.durationMinutes} min
            </span>
          </div>

          {/* Row 2: Client name (the most important info) */}
          {appointment.customerName && (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="font-medium text-foreground">
                {appointment.customerName}
              </span>
              {appointment.customerSegment && (
                <Badge
                  variant={
                    SEGMENT_VARIANT[appointment.customerSegment] ?? "secondary"
                  }
                  size="sm"
                  className="text-[10px]"
                >
                  {SEGMENT_LABEL[appointment.customerSegment] ??
                    appointment.customerSegment}
                </Badge>
              )}
            </div>
          )}

          {/* Row 3: Event type + Status badges */}
          <div className="mb-1 flex flex-wrap gap-1">
            <Badge variant="secondary" size="sm">
              {eventLabel}
            </Badge>
            <Badge variant={STATUS_VARIANT[appointment.status] ?? "secondary"} size="sm">
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </Badge>
            {appointment.isVirtual && (
              <Badge variant="info" size="sm">
                Virtual
              </Badge>
            )}
          </div>

          {/* Row 4: BA name (in store view) */}
          {showBa && appointment.baName && (
            <div className="text-muted-foreground">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-accent/60" />
              {appointment.baName}
            </div>
          )}

          {/* Row 5: Phone if available */}
          {appointment.customerPhone && (
            <div className="tabular-nums text-muted-foreground">
              {appointment.customerPhone}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

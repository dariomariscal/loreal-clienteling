"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  useAppointmentEventTypes,
  type AppointmentEventType,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentsIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  customerId: string;
  baUserId: string;
  storeId: string;
  eventTypeId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  comments: string | null;
  isVirtual: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "info" | "success" | "warning" | "destructive" | "secondary"
> = {
  scheduled: "default",
  confirmed: "info",
  rescheduled: "warning",
  cancelled: "destructive",
  completed: "success",
  no_show: "destructive",
};

interface AppointmentsSectionProps {
  customerId: string;
  onNewAppointment?: () => void;
}

export function AppointmentsSection({
  customerId,
  onNewAppointment,
}: AppointmentsSectionProps) {
  // Backend doesn't yet filter /appointments by customer, so we fetch the
  // BA's full list and filter client-side. Cheap for typical caseloads.
  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ["appointments", "customer", customerId],
    queryFn: () => api.get<Appointment[]>("/appointments"),
    enabled: !!customerId,
  });
  const { data: eventTypes = [] } = useAppointmentEventTypes();
  const eventTypeMap = React.useMemo(
    () => new Map(eventTypes.map((t) => [t.id, t])),
    [eventTypes],
  );

  const appointments = allAppointments.filter(
    (a) => a.customerId === customerId,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        illustration={<AppointmentsIllustration />}
        title="Sin citas registradas"
        description="Agenda la primera cita para esta clienta. El BA puede elegir entre facial, cabina, evento aniversario y más."
        action={
          onNewAppointment ? (
            <Button onClick={onNewAppointment}>Agendar cita</Button>
          ) : undefined
        }
      />
    );
  }

  const now = Date.now();
  const upcoming = appointments
    .filter((a) => new Date(a.scheduledAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  const past = appointments
    .filter((a) => new Date(a.scheduledAt).getTime() < now)
    .sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {appointments.length}{" "}
          {appointments.length === 1 ? "cita" : "citas"} en total
        </p>
        {onNewAppointment && (
          <Button size="sm" onClick={onNewAppointment}>
            Nueva cita
          </Button>
        )}
      </div>

      {upcoming.length > 0 && (
        <Group label="Próximas" appointments={upcoming} typeMap={eventTypeMap} />
      )}
      {past.length > 0 && (
        <Group label="Historial" appointments={past} typeMap={eventTypeMap} muted />
      )}
    </div>
  );
}

function Group({
  label,
  appointments,
  typeMap,
  muted,
}: {
  label: string;
  appointments: Appointment[];
  typeMap: Map<string, AppointmentEventType>;
  muted?: boolean;
}) {
  return (
    <section className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-2">
        {appointments.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appointment={appt}
            eventType={typeMap.get(appt.eventTypeId) ?? null}
            muted={muted}
          />
        ))}
      </ul>
    </section>
  );
}

function AppointmentCard({
  appointment,
  eventType,
  muted,
}: {
  appointment: Appointment;
  eventType: AppointmentEventType | null;
  muted?: boolean;
}) {
  const accent = eventType?.color ?? "var(--accent)";
  const start = new Date(appointment.scheduledAt);
  const end = new Date(
    start.getTime() + appointment.durationMinutes * 60_000,
  );
  const dateLabel = start.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startLabel = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = end.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 transition-shadow duration-200 hover:shadow-sm",
        muted ? "opacity-80" : "",
      )}
      style={{
        borderColor: muted ? undefined : accent,
      }}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accent, opacity: muted ? 0.4 : 1 }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {dateLabel}
          </p>
          <p className="font-heading text-lg tabular-nums text-foreground">
            {startLabel} – {endLabel}
          </p>
          <p className="text-sm text-foreground">
            {eventType?.displayName ?? appointment.eventTypeId}
            {appointment.isVirtual && (
              <span className="ml-2 text-xs text-muted-foreground">
                · Virtual
              </span>
            )}
          </p>
          {appointment.comments && (
            <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
              {appointment.comments}
            </p>
          )}
        </div>
        <Badge
          variant={STATUS_VARIANT[appointment.status] ?? "secondary"}
          size="sm"
        >
          {STATUS_LABEL[appointment.status] ?? appointment.status}
        </Badge>
      </div>
    </li>
  );
}

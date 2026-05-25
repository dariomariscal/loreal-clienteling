"use client";

import { useMemo } from "react";
import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { Badge } from "@/components/ui/badge";
import { useAppointmentCalendar } from "@/lib/hooks/use-appointments";
import { AppointmentGlyph } from "@/components/ui/glyphs";
import type { CalendarAppointment } from "@/lib/hooks/use-appointments";

export function AppointmentsPage() {
  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data, isLoading } = useAppointmentCalendar(range.from, range.to);

  const groups = groupByDay(data ?? []);

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <header className="mb-10">
          <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
            Citas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Próximos 14 días
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : groups.length === 0 ? (
          <AdvisorEmptyState
            icon={<AppointmentGlyph className="size-6" />}
            title="Sin citas agendadas"
            description="Tus próximas dos semanas están libres."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <SectionCard key={group.dayKey} title={dayLabel(group.day)}>
                <ul className="divide-y divide-border">
                  {group.appointments.map((appt) => (
                    <AppointmentRow key={appt.id} appointment={appt} />
                  ))}
                </ul>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </SingleColumn>
  );
}

function AppointmentRow({
  appointment,
}: {
  appointment: CalendarAppointment;
}) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <time className="w-16 shrink-0 font-mono text-sm tabular-nums text-foreground">
        {format(new Date(appointment.startTime), "HH:mm")}
      </time>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {appointment.customerName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {appointment.serviceTypeName ?? "Servicio"} ·{" "}
          {appointment.durationMinutes} min
          {appointment.isVirtual ? " · virtual" : ""}
        </p>
      </div>
      {appointment.customerLifecycleStage === "vip" ? (
        <Badge variant="outline" className="uppercase tracking-wider">
          VIP
        </Badge>
      ) : null}
      <Badge variant="secondary" size="sm">
        {appointment.status}
      </Badge>
    </li>
  );
}

interface DayGroup {
  dayKey: string;
  day: Date;
  appointments: CalendarAppointment[];
}

function groupByDay(items: CalendarAppointment[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const a of items) {
    const day = new Date(a.startTime);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString();
    let group = map.get(key);
    if (!group) {
      group = { dayKey: key, day, appointments: [] };
      map.set(key, group);
    }
    group.appointments.push(a);
  }
  for (const g of map.values()) {
    g.appointments.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }
  return [...map.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
}

function dayLabel(day: Date): string {
  if (isToday(day)) return "Hoy";
  if (isTomorrow(day)) return "Mañana";
  if (isSameDay(day, new Date())) return "Hoy";
  return format(day, "EEEE d 'de' MMMM", { locale: es });
}

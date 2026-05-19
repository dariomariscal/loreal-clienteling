"use client";

import { cn } from "@/lib/utils";
import { AppointmentCard } from "./appointment-card";
import type { CalendarAppointment } from "@/lib/hooks";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface WeekCalendarProps {
  appointments: CalendarAppointment[];
  weekStart: Date;
  onAppointmentClick: (appt: CalendarAppointment) => void;
  showBa?: boolean;
}

export function WeekCalendar({
  appointments,
  weekStart,
  onAppointmentClick,
  showBa,
}: WeekCalendarProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function getAppointmentsForDay(day: Date) {
    const dayStr = day.toISOString().split("T")[0];
    return appointments
      .filter((a) => a.scheduledAt.startsWith(dayStr))
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50">
      {days.map((day, i) => {
        const dayStr = day.toISOString().split("T")[0];
        const isToday = dayStr === today;
        const dayAppointments = getAppointmentsForDay(day);

        return (
          <div key={i} className="flex min-h-[240px] flex-col bg-card">
            {/* Day header */}
            <div
              className={cn(
                "border-b border-border/50 px-2 py-1.5 text-center text-xs",
                isToday
                  ? "bg-primary/5 font-semibold text-primary"
                  : "text-muted-foreground/60",
              )}
            >
              <div>{DAY_NAMES[i]}</div>
              <div
                className={`text-sm ${
                  isToday
                    ? "inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                {day.getDate()}
              </div>
              {dayAppointments.length > 0 && (
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {dayAppointments.length} cita{dayAppointments.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Appointments */}
            <div className="flex-1 space-y-1.5 overflow-y-auto p-1.5">
              {dayAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onClick={() => onAppointmentClick(appt)}
                  showBa={showBa}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

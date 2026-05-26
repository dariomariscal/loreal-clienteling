"use client";

import * as React from "react";
import type { CalendarAppointment } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// ── Vertical time-grid calendar (Fresha / Boulevard pattern) ───────
// Day view = one wide column. Week view = 7 columns. Y axis is hours.
// Appointments render as colored blocks positioned absolutely with a
// height proportional to durationMinutes. Click an empty area to create
// a new appointment, click a block to open its detail sheet.

export type CalendarView = "day" | "week";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 21;
const SLOT_MINUTES = 30;
const DEFAULT_HOUR_HEIGHT = 64; // px per hour — gives 32px per slot.
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i,
);

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface TimeGridCalendarProps {
  view: CalendarView;
  /** Day view: the day to render. Week view: the Monday of the week. */
  anchor: Date;
  appointments: CalendarAppointment[];
  onAppointmentClick: (a: CalendarAppointment) => void;
  /** Fires when the BA taps an empty cell. ISO string of slot start. */
  onSlotClick: (isoStartsAt: string) => void;
  /** Show BA name on blocks (store view for managers). */
  showBa?: boolean;
  isLoading?: boolean;
  /**
   * Pixels per hour. Default 64. The advisor surface on iPad raises this
   * to ~80 so each half-hour slot reaches the 40px tap target.
   */
  hourHeight?: number;
  /**
   * Fallback color used when a service type has no color. Defaults to
   * var(--accent); the advisor passes var(--ba-accent).
   */
  fallbackAccent?: string;
}

export function TimeGridCalendar({
  view,
  anchor,
  appointments,
  onAppointmentClick,
  onSlotClick,
  showBa,
  isLoading,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  fallbackAccent = "var(--accent)",
}: TimeGridCalendarProps) {
  const days = React.useMemo(
    () => (view === "day" ? [anchor] : weekDays(anchor)),
    [view, anchor],
  );

  // "Now" line — only shown if today is in the visible range.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      {/* Header row: day labels */}
      <div
        className={cn(
          "sticky top-0 z-10 grid border-b border-border/40 bg-card",
          view === "day"
            ? "grid-cols-[60px_1fr]"
            : "grid-cols-[60px_repeat(7,1fr)]",
        )}
      >
        <div aria-hidden />
        {days.map((d) => (
          <DayHeader key={d.toISOString()} date={d} compact={view === "week"} />
        ))}
      </div>

      {/* Grid body */}
      <div className="relative overflow-x-auto">
        <div
          className={cn(
            "relative grid",
            view === "day"
              ? "grid-cols-[60px_1fr]"
              : "grid-cols-[60px_repeat(7,1fr)]",
          )}
          style={{
            height:
              (DAY_END_HOUR - DAY_START_HOUR + 1) * hourHeight + "px",
          }}
        >
          {/* Hour rail */}
          <div className="relative">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground/70"
                style={{ top: i * hourHeight + "px" }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              appointments={appointments.filter((a) =>
                sameDay(new Date(a.startTime), day),
              )}
              onAppointmentClick={onAppointmentClick}
              onSlotClick={onSlotClick}
              now={now}
              showBa={showBa}
              isLoading={isLoading && dayIdx === 0}
              hourHeight={hourHeight}
              fallbackAccent={fallbackAccent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Day header ────────────────────────────────────────────────────

function DayHeader({ date, compact }: { date: Date; compact: boolean }) {
  const isToday = sameDay(date, new Date());
  const weekday = date.toLocaleDateString("es-MX", { weekday: "short" });
  const dayNum = date.getDate();

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] uppercase tracking-wider",
          isToday ? "text-foreground" : "text-muted-foreground/70",
        )}
      >
        <span>{weekday.replace(".", "")}</span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full font-heading text-sm",
            isToday && "bg-foreground text-background",
          )}
        >
          {dayNum}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2 px-4 py-3">
      <p
        className={cn(
          "text-[10px] font-medium uppercase tracking-widest",
          isToday ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {weekday.replace(".", "")}
      </p>
      <span
        className={cn(
          "font-heading text-lg",
          isToday ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {dayNum}
      </span>
      {isToday && (
        <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-background">
          Hoy
        </span>
      )}
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────

function DayColumn({
  day,
  appointments,
  onAppointmentClick,
  onSlotClick,
  now,
  showBa,
  isLoading,
  hourHeight,
  fallbackAccent,
}: {
  day: Date;
  appointments: CalendarAppointment[];
  onAppointmentClick: (a: CalendarAppointment) => void;
  onSlotClick: (iso: string) => void;
  now: Date;
  showBa?: boolean;
  isLoading?: boolean;
  hourHeight: number;
  fallbackAccent: string;
}) {
  const isToday = sameDay(day, now);
  const nowTop = isToday ? minutesFromDayStart(now) * (hourHeight / 60) : null;
  const slotHeight = hourHeight / 2;
  const isPastDay = !isToday && day.getTime() < startOfDay(now).getTime();

  return (
    <div className="relative border-l border-border/30">
      {/* Background slot grid — clickable to create */}
      {HOURS.map((h, i) => (
        <React.Fragment key={h}>
          <SlotCell
            day={day}
            hour={h}
            minute={0}
            top={i * hourHeight}
            height={slotHeight}
            onClick={onSlotClick}
            isPast={isPastDay || isSlotPast(day, h, 0, now)}
          />
          {/* Half-hour slot, no top border so the hour visually dominates */}
          <SlotCell
            day={day}
            hour={h}
            minute={30}
            top={i * hourHeight + slotHeight}
            height={slotHeight}
            onClick={onSlotClick}
            isHalfHour
            isPast={isPastDay || isSlotPast(day, h, 30, now)}
          />
        </React.Fragment>
      ))}

      {/* Past-time veil — gray everything above the now line so the BA sees
          at a glance which slots have already passed. */}
      {nowTop !== null && nowTop > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-muted/30"
          style={{ height: nowTop + "px" }}
          aria-hidden
        />
      )}

      {/* Now line */}
      {nowTop !== null && nowTop >= 0 && nowTop <= (DAY_END_HOUR - DAY_START_HOUR) * hourHeight && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-20"
          style={{ top: nowTop + "px" }}
        >
          <div className="flex items-center gap-1">
            <span className="size-2 -translate-x-1 rounded-full bg-destructive" />
            <span className="h-px flex-1 bg-destructive" />
          </div>
        </div>
      )}

      {/* Appointment blocks */}
      {!isLoading &&
        appointments.map((a) => (
          <AppointmentBlock
            key={a.id}
            appointment={a}
            onClick={() => onAppointmentClick(a)}
            showBa={showBa}
            hourHeight={hourHeight}
            fallbackAccent={fallbackAccent}
          />
        ))}

      {isLoading && (
        <div className="absolute inset-x-1 top-3 space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-muted/40"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCell({
  day,
  hour,
  minute,
  top,
  height,
  onClick,
  isHalfHour,
  isPast,
}: {
  day: Date;
  hour: number;
  minute: number;
  top: number;
  height: number;
  onClick: (iso: string) => void;
  isHalfHour?: boolean;
  isPast?: boolean;
}) {
  function handleClick() {
    if (isPast) return;
    const d = new Date(day);
    d.setHours(hour, minute, 0, 0);
    onClick(d.toISOString());
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPast}
      aria-label={
        isPast
          ? `Hora pasada ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
          : `Crear cita ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      }
      className={cn(
        "absolute inset-x-0 z-0 transition-colors duration-100",
        !isHalfHour && "border-t border-border/30",
        isPast ? "cursor-not-allowed" : "hover:bg-muted/30",
      )}
      style={{ top: top + "px", height: height + "px" }}
    />
  );
}

// ── Appointment block ────────────────────────────────────────────

function AppointmentBlock({
  appointment,
  onClick,
  showBa,
  hourHeight,
  fallbackAccent,
}: {
  appointment: CalendarAppointment;
  onClick: () => void;
  showBa?: boolean;
  hourHeight: number;
  fallbackAccent: string;
}) {
  const start = new Date(appointment.startTime);
  const minutesFromTop = minutesFromDayStart(start);
  const top = minutesFromTop * (hourHeight / 60);
  const height = appointment.durationMinutes * (hourHeight / 60);
  const accent = appointment.serviceTypeColor ?? fallbackAccent;
  const startLabel = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  // Hide block visually when it falls outside the visible window (e.g. an
  // appointment at 7:30am when the grid starts at 9). The user can still
  // open the day in detail later if needed.
  if (top < -8 || top > (DAY_END_HOUR - DAY_START_HOUR + 1) * hourHeight) {
    return null;
  }
  // Cancelled / no-show are dimmed so they don't compete with active ones.
  const muted =
    appointment.status === "cancelled" || appointment.status === "no_show";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute left-1 right-1 z-10 flex flex-col overflow-hidden rounded-lg border bg-card px-2 py-1 text-left",
        "shadow-sm transition-all duration-150",
        "hover:shadow-md hover:-translate-y-px",
        muted && "opacity-50",
      )}
      style={{
        top: top + "px",
        height: Math.max(height, 28) + "px",
        borderColor: accent,
        backgroundColor: `color-mix(in oklab, ${accent} 10%, var(--card))`,
      }}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <p className="ml-1 text-[10px] font-medium tabular-nums text-foreground">
        {startLabel}
      </p>
      <p className="ml-1 line-clamp-1 text-[12px] font-medium text-foreground">
        {appointment.customerName || "Sin nombre"}
      </p>
      {height >= 50 && (
        <p className="ml-1 line-clamp-1 text-[10px] text-muted-foreground">
          {appointment.serviceTypeName ?? "Cita"}
          {showBa && appointment.staffName ? ` · ${appointment.staffName}` : ""}
        </p>
      )}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/**
 * True when the given hour:minute on `day` is already in the past relative
 * to `now`. Mirrors the API's "no slots in the past" rule in
 * appointments.service.ts → buildDaySlots, so the calendar doesn't offer
 * cells that the backend would refuse to book.
 */
function isSlotPast(day: Date, hour: number, minute: number, now: Date): boolean {
  const slot = new Date(day);
  slot.setHours(hour, minute, 0, 0);
  return slot.getTime() <= now.getTime();
}

function minutesFromDayStart(d: Date): number {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}
// DAY_NAMES is exported for parity with the previous weekly grid; some
// downstream code may want to reuse it.
export { DAY_NAMES };

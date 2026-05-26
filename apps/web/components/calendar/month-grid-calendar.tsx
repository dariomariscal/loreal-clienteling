"use client";

import * as React from "react";
import type { CalendarAppointment } from "@/lib/hooks/use-appointments";
import { cn } from "@/lib/utils";

// ── Month-view calendar (Google Calendar / Apple Calendar pattern) ─
// Renders a 7×N grid that always starts on Monday and includes the days
// from the previous/next month needed to fill the first and last rows.
// Each cell shows up to MAX_VISIBLE pills; the rest collapse into "+N más".
// Click a day → caller usually switches to day view; click a pill → detail.

const DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_VISIBLE = 3;

interface MonthGridCalendarProps {
  /** Any date inside the month to render. */
  month: Date;
  appointments: CalendarAppointment[];
  onDayClick: (day: Date) => void;
  onAppointmentClick: (a: CalendarAppointment) => void;
  /** Fires when the BA taps the "+N más" chip. Caller usually opens day view. */
  onOverflowClick?: (day: Date) => void;
  isLoading?: boolean;
  fallbackAccent?: string;
}

export function MonthGridCalendar({
  month,
  appointments,
  onDayClick,
  onAppointmentClick,
  onOverflowClick,
  isLoading,
  fallbackAccent = "var(--accent)",
}: MonthGridCalendarProps) {
  const cells = React.useMemo(() => buildMonthCells(month), [month]);
  const byDay = React.useMemo(
    () => groupAppointmentsByDay(appointments),
    [appointments],
  );

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      {/* Header row: weekday labels */}
      <div className="grid grid-cols-7 border-b border-border/40">
        {DAY_HEADERS.map((label) => (
          <div
            key={label}
            className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-7 grid-rows-[repeat(auto-fit,minmax(120px,1fr))]">
        {cells.map((cell) => {
          const dayKey = toDayKey(cell.date);
          const dayAppointments = byDay.get(dayKey) ?? [];
          return (
            <DayCell
              key={cell.date.toISOString()}
              date={cell.date}
              inMonth={cell.inMonth}
              isToday={sameDay(cell.date, today)}
              appointments={dayAppointments}
              onDayClick={onDayClick}
              onAppointmentClick={onAppointmentClick}
              onOverflowClick={onOverflowClick}
              isLoading={isLoading}
              fallbackAccent={fallbackAccent}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────

function DayCell({
  date,
  inMonth,
  isToday,
  appointments,
  onDayClick,
  onAppointmentClick,
  onOverflowClick,
  isLoading,
  fallbackAccent,
}: {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  appointments: CalendarAppointment[];
  onDayClick: (day: Date) => void;
  onAppointmentClick: (a: CalendarAppointment) => void;
  onOverflowClick?: (day: Date) => void;
  isLoading?: boolean;
  fallbackAccent: string;
}) {
  const visible = appointments.slice(0, MAX_VISIBLE);
  const overflow = appointments.length - visible.length;

  return (
    <div
      className={cn(
        "group/cell relative flex min-h-[120px] flex-col gap-1 border-b border-r border-border/30 p-2 transition-colors",
        !inMonth && "bg-muted/10",
      )}
    >
      {/* Day number — tappable to open the day */}
      <button
        type="button"
        onClick={() => onDayClick(date)}
        className={cn(
          "self-start rounded-full text-left text-[12px] font-medium tabular-nums transition-colors",
          isToday
            ? "flex size-7 items-center justify-center bg-foreground text-background"
            : inMonth
              ? "px-1.5 py-0.5 text-foreground hover:bg-muted/40"
              : "px-1.5 py-0.5 text-muted-foreground/50 hover:bg-muted/40",
        )}
        aria-label={`Ver día ${date.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`}
      >
        {date.getDate()}
      </button>

      {/* Appointment pills */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5">
        {isLoading ? (
          <div className="h-4 animate-pulse rounded bg-muted/40" />
        ) : (
          <>
            {visible.map((appt) => (
              <AppointmentPill
                key={appt.id}
                appointment={appt}
                onClick={() => onAppointmentClick(appt)}
                fallbackAccent={fallbackAccent}
              />
            ))}
            {overflow > 0 && (
              <button
                type="button"
                onClick={() =>
                  onOverflowClick ? onOverflowClick(date) : onDayClick(date)
                }
                className="self-start px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                +{overflow} más
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Appointment pill ──────────────────────────────────────────────

function AppointmentPill({
  appointment,
  onClick,
  fallbackAccent,
}: {
  appointment: CalendarAppointment;
  onClick: () => void;
  fallbackAccent: string;
}) {
  const accent = appointment.serviceTypeColor ?? fallbackAccent;
  const start = new Date(appointment.startTime);
  const timeLabel = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
        "flex w-full items-center gap-1.5 overflow-hidden rounded px-1.5 py-0.5 text-left transition-colors hover:opacity-90",
        muted && "opacity-50",
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${accent} 14%, var(--card))`,
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
        {timeLabel}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
        {appointment.customerName || "Sin nombre"}
      </span>
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

interface MonthCell {
  date: Date;
  inMonth: boolean;
}

/**
 * Build the 7×N matrix that backs the month grid. We always start on the
 * Monday on/before the month's 1st and end on the Sunday on/after the last
 * day, so every row has exactly 7 cells. Days outside the month render
 * dimmed but stay tappable, matching Google Calendar.
 */
function buildMonthCells(anchor: Date): MonthCell[] {
  const targetMonth = anchor.getMonth();
  const first = new Date(anchor.getFullYear(), targetMonth, 1);
  first.setHours(0, 0, 0, 0);
  // JS getDay: 0 = Sunday, 1 = Monday … We want Monday-first columns, so the
  // offset from Monday is (day + 6) % 7.
  const offsetFromMonday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offsetFromMonday);

  const cells: MonthCell[] = [];
  const cursor = new Date(start);
  // 6 weeks always covers any month layout (max needed is 6 rows for months
  // that start on Sun and have 31 days).
  for (let i = 0; i < 42; i++) {
    cells.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === targetMonth,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  // Trim trailing all-out-of-month rows: if the last 7 cells are all outside
  // the target month, drop that row. Keeps short months from rendering an
  // unused 6th week.
  while (cells.length > 28) {
    const tail = cells.slice(cells.length - 7);
    if (tail.every((c) => !c.inMonth)) {
      cells.length -= 7;
    } else break;
  }
  return cells;
}

function groupAppointmentsByDay(
  list: CalendarAppointment[],
): Map<string, CalendarAppointment[]> {
  const map = new Map<string, CalendarAppointment[]>();
  for (const a of list) {
    const key = toDayKey(new Date(a.startTime));
    const arr = map.get(key);
    if (arr) arr.push(a);
    else map.set(key, [a]);
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }
  return map;
}

function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

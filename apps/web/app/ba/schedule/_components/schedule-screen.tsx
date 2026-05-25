"use client";

import * as React from "react";
import { ViewHeader } from "../../_components/view-header";
import {
  AppointmentRow,
  DayGroupHeader,
  NewAppointmentSheet,
  type AppointmentRowEmphasis,
  type AppointmentRowStatus,
} from "@/components/ba";
import { Button } from "@/components/ui/button";
import { CalendarPlusGlyph } from "@/components/ui/glyphs";
import { useAppointmentCalendar } from "@/lib/hooks";
import type { CalendarAppointment } from "@/lib/hooks/use-appointments";
import type { SessionUser } from "@/lib/auth";

interface ScheduleScreenProps {
  user: SessionUser;
}

// Agenda — single-column chronological list, no view tabs.
//
// Cal.com bookings + Things 3 Today pattern: a flat scroll grouped by
// natural day buckets ("Hoy / Mañana / Esta semana / Próximas") whose
// separator is just an eyebrow, no rule line. Each row anchors itself
// with a vertical TimePill, and the only screen with any chrome is the
// next upcoming row — 2px accent border on the left. The current one
// (in-progress) dims to 60% with a tiny accent dot at the gutter.
//
// New appointment intent is exposed as a ghost button in the header
// (Linear/Endear style). No FAB — incompatible with the editorial tone.
export function ScheduleScreen({ user }: ScheduleScreenProps) {
  const range = React.useMemo(() => getRange(30), []);
  const calendar = useAppointmentCalendar(range.from, range.to, {
    staffUserId: user.id,
  });

  const grouped = React.useMemo(
    () => groupByDay(calendar.data ?? []),
    [calendar.data],
  );

  const flagged = React.useMemo(() => flagCurrentAndNext(grouped), [grouped]);

  const [isNewApptOpen, setIsNewApptOpen] = React.useState(false);

  return (
    <>
      <ViewHeader
        eyebrow={formatTodayEyebrow()}
        title="Citas"
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsNewApptOpen(true)}
          >
            <CalendarPlusGlyph className="size-3.5" />
            Nueva cita
          </Button>
        }
      />

      <NewAppointmentSheet
        open={isNewApptOpen}
        onOpenChange={setIsNewApptOpen}
        staffUserId={user.id}
      />

      <div className="px-8 pt-8 pb-20">
        <div className="mx-auto max-w-2xl">
          {calendar.isLoading ? (
            <ListSkeleton />
          ) : calendar.isError ? (
            <ErrorRow onRetry={() => calendar.refetch()} />
          ) : flagged.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              {flagged.map((group) => (
                <section key={group.key}>
                  <DayGroupHeader label={group.label} date={group.date} />
                  <ul>
                    {group.items.map((row) => (
                      <li key={row.appointment.id}>
                        <AppointmentRow
                          customerId={row.appointment.customerId}
                          customerName={row.appointment.customerName}
                          startTime={row.appointment.startTime}
                          durationMinutes={row.appointment.durationMinutes}
                          serviceTypeName={row.appointment.serviceTypeName}
                          serviceTypeColor={row.appointment.serviceTypeColor}
                          isVirtual={row.appointment.isVirtual}
                          status={mapStatus(row.appointment.status)}
                          emphasis={row.emphasis}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── States ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p
        className="text-[14px] text-foreground"
        style={{ fontWeight: 540 }}
      >
        Sin citas próximas.
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Agenda una desde la ficha de una clienta o aquí mismo.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-px" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="h-[72px] animate-pulse rounded-md bg-muted/30" />
      ))}
    </ul>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="text-[13px] text-destructive">
        No pude cargar tu agenda. Intenta de nuevo en un momento.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 text-[12px] text-destructive underline-offset-4 hover:underline"
      >
        Reintentar
      </button>
    </div>
  );
}

// ── Grouping + emphasis ─────────────────────────────────────────────

interface ScheduleRow {
  appointment: CalendarAppointment;
  emphasis: AppointmentRowEmphasis;
}

interface ScheduleGroup {
  key: string;
  label: string;
  date?: Date;
  items: ScheduleRow[];
}

function groupByDay(appts: CalendarAppointment[]): ScheduleGroup[] {
  const sorted = [...appts].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const dayAfterTomorrow = new Date(today.getTime() + 2 * 86_400_000);
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000);

  const buckets: Record<string, ScheduleGroup> = {
    today: { key: "today", label: "Hoy", date: today, items: [] },
    tomorrow: {
      key: "tomorrow",
      label: "Mañana",
      date: tomorrow,
      items: [],
    },
    week: { key: "week", label: "Esta semana", items: [] },
    later: { key: "later", label: "Próximas", items: [] },
  };

  for (const a of sorted) {
    const d = new Date(a.startTime);
    const row: ScheduleRow = { appointment: a, emphasis: "default" };
    if (d >= today && d < tomorrow) buckets.today.items.push(row);
    else if (d >= tomorrow && d < dayAfterTomorrow)
      buckets.tomorrow.items.push(row);
    else if (d >= dayAfterTomorrow && d < weekEnd) buckets.week.items.push(row);
    else if (d >= weekEnd) buckets.later.items.push(row);
  }

  return Object.values(buckets).filter((g) => g.items.length > 0);
}

// Mark the appointment that is currently happening (between startTime
// and startTime + duration) and the next one after that as "current"
// and "next". Only applies to "Hoy"; the rest stay default.
function flagCurrentAndNext(groups: ScheduleGroup[]): ScheduleGroup[] {
  const todayGroup = groups.find((g) => g.key === "today");
  if (!todayGroup) return groups;

  const now = Date.now();
  let foundCurrent = false;
  let nextIndex = -1;

  for (let i = 0; i < todayGroup.items.length; i++) {
    const a = todayGroup.items[i].appointment;
    const start = new Date(a.startTime).getTime();
    const end = start + a.durationMinutes * 60_000;
    if (start <= now && now < end) {
      todayGroup.items[i] = { ...todayGroup.items[i], emphasis: "current" };
      foundCurrent = true;
      nextIndex = i + 1;
      break;
    }
    if (start > now && nextIndex === -1) {
      nextIndex = i;
    }
  }

  if (!foundCurrent && nextIndex === -1) {
    // No current appointment, no upcoming today — leave defaults.
    return groups;
  }
  if (nextIndex >= 0 && nextIndex < todayGroup.items.length) {
    todayGroup.items[nextIndex] = {
      ...todayGroup.items[nextIndex],
      emphasis: "next",
    };
  }

  return groups;
}

// ── Helpers ─────────────────────────────────────────────────────────

function mapStatus(status: string): AppointmentRowStatus {
  switch (status) {
    case "confirmed":
    case "booked":
    case "completed":
      return "confirmed";
    case "pending":
    case "tentative":
      return "pending";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "no_show":
    case "noshow":
      return "no_show";
    default:
      return "confirmed";
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getRange(days: number): { from: string; to: string } {
  const now = new Date();
  const from = startOfDay(now).toISOString();
  const to = new Date(now.getTime() + days * 86_400_000).toISOString();
  return { from, to };
}

function formatTodayEyebrow(): string {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

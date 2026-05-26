"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { APPOINTMENT_STATUSES } from "@loreal/contracts";
import {
  useAppointmentCalendar,
  useUpdateAppointment,
  type CalendarAppointment,
} from "@/lib/hooks/use-appointments";
import { AppointmentSheet } from "@/components/appointment/appointment-sheet";
import { TimeGridCalendar } from "@/components/calendar/time-grid-calendar";
import { MonthGridCalendar } from "@/components/calendar/month-grid-calendar";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Labels ────────────────────────────────────────────────────────

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

// ── Types ────────────────────────────────────────────────────────

type AdvisorView = "day" | "month";

type SheetState =
  | null
  | { mode: "detail"; appointment: CalendarAppointment }
  | { mode: "create"; defaultStartsAt: string | null };

// ── Component ────────────────────────────────────────────────────

interface AppointmentsPageProps {
  user: SessionUser;
}

export function AppointmentsPage({ user }: AppointmentsPageProps) {
  // Gate on hydration: every derived value starts from `new Date()`, which
  // diverges between server (UTC) and client (browser TZ). Render an empty
  // shell during SSR so the markup matches; the real UI mounts on hydrate.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <SingleColumn><div aria-hidden /></SingleColumn>;
  }
  return <AppointmentsPageInner user={user} />;
}

function AppointmentsPageInner({ user }: AppointmentsPageProps) {
  const [view, setView] = React.useState<AdvisorView>("day");
  const [anchor, setAnchor] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const [statusUpdate, setStatusUpdate] = React.useState("");

  // Day view fetches one day. Month view fetches the whole grid the user is
  // looking at, including spillover days from the prev/next month that the
  // calendar renders dimmed — otherwise pills wouldn't show up on those.
  const range = React.useMemo(() => {
    if (view === "day") {
      const to = new Date(anchor);
      to.setDate(to.getDate() + 1);
      return { from: anchor.toISOString(), to: to.toISOString() };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    first.setHours(0, 0, 0, 0);
    const offsetFromMonday = (first.getDay() + 6) % 7;
    const from = new Date(first);
    from.setDate(first.getDate() - offsetFromMonday);
    const to = new Date(from);
    // 6 weeks max — buildMonthCells in the month grid trims unused tail rows.
    to.setDate(to.getDate() + 42);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [view, anchor]);

  const { data: calendarData = [], isLoading } = useAppointmentCalendar(
    range.from,
    range.to,
  );

  const updateAppointment = useUpdateAppointment();
  const isPending = updateAppointment.isPending;

  function handleStatusChange() {
    if (sheet?.mode !== "detail" || !statusUpdate) return;
    updateAppointment.mutate(
      { id: sheet.appointment.id, status: statusUpdate },
      { onSuccess: () => setSheet(null) },
    );
  }

  function shift(direction: 1 | -1) {
    setAnchor((d) => {
      const n = new Date(d);
      if (view === "month") {
        n.setMonth(n.getMonth() + direction);
      } else {
        n.setDate(n.getDate() + direction);
      }
      return n;
    });
  }

  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setAnchor(d);
  }

  return (
    <SingleColumn>
      <div className="flex h-full flex-col">
        {/* ── Toolbar ──────────────────────────────────────────── */}
        <header className="border-b border-border/40 bg-[color:var(--ba-surface)] px-6 pb-4 pt-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
                Citas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                {view === "day" ? formatDayLabel(anchor) : formatMonthLabel(anchor)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <IconButton
                  aria-label={view === "day" ? "Día anterior" : "Mes anterior"}
                  onClick={() => shift(-1)}
                >
                  <ChevronLeftIcon className="size-4" />
                </IconButton>
                <button
                  type="button"
                  onClick={goToday}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Hoy
                </button>
                <IconButton
                  aria-label={view === "day" ? "Día siguiente" : "Mes siguiente"}
                  onClick={() => shift(1)}
                >
                  <ChevronRightIcon className="size-4" />
                </IconButton>
              </div>

              <ViewSwitch
                value={view}
                onChange={(v) => setView(v)}
                items={[
                  { value: "day", label: "Día" },
                  { value: "month", label: "Mes" },
                ]}
              />

              <Button
                onClick={() =>
                  setSheet({ mode: "create", defaultStartsAt: null })
                }
                className="h-10"
              >
                + Cita
              </Button>
            </div>
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10 lg:py-8">
            {view === "day" ? (
              <TimeGridCalendar
                view="day"
                anchor={anchor}
                appointments={calendarData}
                isLoading={isLoading}
                hourHeight={80}
                fallbackAccent="var(--ba-accent)"
                onAppointmentClick={(appt) => {
                  setStatusUpdate(appt.status);
                  setSheet({ mode: "detail", appointment: appt });
                }}
                onSlotClick={(iso) =>
                  setSheet({ mode: "create", defaultStartsAt: iso })
                }
              />
            ) : (
              <MonthGridCalendar
                month={anchor}
                appointments={calendarData}
                isLoading={isLoading}
                fallbackAccent="var(--ba-accent)"
                onAppointmentClick={(appt) => {
                  setStatusUpdate(appt.status);
                  setSheet({ mode: "detail", appointment: appt });
                }}
                onDayClick={(day) => {
                  // Open the booking sheet directly with the day preselected.
                  // We anchor at midnight local time — the sheet uses this as
                  // a "day-only" signal and lets the BA pick the exact time
                  // inside the wizard (no auto-time preselection).
                  const seed = new Date(day);
                  seed.setHours(0, 0, 0, 0);
                  setSheet({
                    mode: "create",
                    defaultStartsAt: seed.toISOString(),
                  });
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Detail sheet ────────────────────────────────────────── */}
      <Sheet
        open={sheet?.mode === "detail"}
        onOpenChange={(open) => !open && setSheet(null)}
      >
        <SheetContent size="default">
          <SheetHeader>
            <SheetTitle>Detalle de cita</SheetTitle>
          </SheetHeader>
          {sheet?.mode === "detail" && (
            <SheetBody>
              <div className="space-y-5">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Clienta
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-lg text-foreground">
                      {sheet.appointment.customerName ?? "Sin nombre"}
                    </span>
                    {sheet.appointment.customerLifecycleStage && (
                      <Badge
                        variant={
                          SEGMENT_VARIANT[
                            sheet.appointment.customerLifecycleStage
                          ] ?? "secondary"
                        }
                        size="sm"
                      >
                        {SEGMENT_LABEL[
                          sheet.appointment.customerLifecycleStage
                        ] ?? sheet.appointment.customerLifecycleStage}
                      </Badge>
                    )}
                  </div>
                  {sheet.appointment.customerPhone && (
                    <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                      {sheet.appointment.customerPhone}
                    </p>
                  )}
                  {sheet.appointment.customerId && (
                    <Link
                      href={`/advisor/customers/${sheet.appointment.customerId}`}
                      className="mt-2 inline-block text-xs font-medium text-[color:var(--ba-accent)] hover:opacity-80"
                    >
                      Ver perfil completo →
                    </Link>
                  )}
                </div>

                <dl className="space-y-3 text-sm">
                  <Row label="Tipo de servicio">
                    <div className="flex items-center gap-2">
                      {sheet.appointment.serviceTypeColor && (
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              sheet.appointment.serviceTypeColor,
                          }}
                        />
                      )}
                      <span>
                        {sheet.appointment.serviceTypeName ?? "Servicio"}
                      </span>
                    </div>
                  </Row>

                  <Row label="Fecha y hora">
                    <span className="first-letter:uppercase">
                      {new Date(
                        sheet.appointment.startTime,
                      ).toLocaleDateString("es-MX", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Row>

                  <Row label="Duración">
                    <span>{sheet.appointment.durationMinutes} min</span>
                  </Row>

                  <Row label="Estado">
                    <Badge
                      variant={
                        STATUS_VARIANT[sheet.appointment.status] ?? "secondary"
                      }
                    >
                      {STATUS_LABEL[sheet.appointment.status] ??
                        sheet.appointment.status}
                    </Badge>
                  </Row>

                  {sheet.appointment.isVirtual && (
                    <Row label="Modalidad">
                      <Badge variant="info" size="sm">
                        Virtual
                      </Badge>
                    </Row>
                  )}

                  {sheet.appointment.notes && (
                    <div>
                      <dt className="mb-1 text-muted-foreground">
                        Comentarios
                      </dt>
                      <dd className="rounded-xl bg-muted/30 p-3 text-sm">
                        {sheet.appointment.notes}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="space-y-2 border-t border-border/60 pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Cambiar estado
                  </p>
                  <div className="flex gap-2">
                    <Select
                      value={statusUpdate}
                      onValueChange={(v) => setStatusUpdate(v ?? "")}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar estado">
                          {statusUpdate
                            ? STATUS_LABEL[statusUpdate] ?? statusUpdate
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={
                        isPending ||
                        statusUpdate === sheet.appointment.status
                      }
                      onClick={handleStatusChange}
                    >
                      {isPending ? "Guardando…" : "Actualizar"}
                    </Button>
                  </div>
                </div>
              </div>
            </SheetBody>
          )}
          <SheetFooter>
            <SheetClose>
              <Button variant="outline">Cerrar</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Create sheet — same wizard the dashboard uses ──────── */}
      <AppointmentSheet
        open={sheet?.mode === "create"}
        onOpenChange={(open) => !open && setSheet(null)}
        staffUserId={user.id}
        defaultStartsAt={
          sheet?.mode === "create" ? sheet.defaultStartsAt : null
        }
      />
    </SingleColumn>
  );
}

// ── Pieces ────────────────────────────────────────────────────────

function ViewSwitch<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex h-10 gap-0.5 rounded-xl border border-border bg-muted/20 p-0.5">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-lg px-4 text-[13px] font-medium transition-all duration-150",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function IconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDayLabel(d: Date): string {
  if (isToday(d)) {
    return `Hoy · ${format(d, "EEEE d 'de' MMMM", { locale: es })}`;
  }
  if (isTomorrow(d)) {
    return `Mañana · ${format(d, "EEEE d 'de' MMMM", { locale: es })}`;
  }
  return format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
}

function formatMonthLabel(d: Date): string {
  return format(d, "MMMM yyyy", { locale: es });
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  useAppointmentCalendar,
  useUpdateAppointment,
  type CalendarAppointment,
} from "@/lib/hooks";
import { APPOINTMENT_STATUSES } from "@loreal/contracts";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AppointmentSheet } from "@/app/(dashboard)/clientes/[id]/_components/appointment-sheet";
import {
  TimeGridCalendar,
  type CalendarView,
} from "./time-grid-calendar";
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

// ── Date helpers ──────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRangeLabel(anchor: Date, view: CalendarView): string {
  if (view === "day") {
    if (isSameDay(anchor, new Date())) {
      return (
        "Hoy · " +
        anchor.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    }
    return anchor.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const end = addDays(anchor, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const startStr = anchor.toLocaleDateString("es-MX", opts);
  const endStr = end.toLocaleDateString("es-MX", {
    ...opts,
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

// ── Types ──────────────────────────────────────────────────────────

type SheetState =
  | null
  | { mode: "detail"; appointment: CalendarAppointment }
  | { mode: "create"; defaultStartsAt: string | null };

// ── Component ──────────────────────────────────────────────────────

interface AgendaPageProps {
  user: { id: string; role?: string | null };
}

export function AgendaPage({ user }: AgendaPageProps) {
  const role = user.role ?? "ba";
  const [view, setView] = React.useState<CalendarView>(
    role === "ba" ? "day" : "week",
  );
  const [anchor, setAnchor] = React.useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return role === "ba" ? today : getMonday(today);
  });
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const [statusUpdate, setStatusUpdate] = React.useState("");
  // Manager-only: viewing the whole store vs only their team's slice.
  const [storeView, setStoreView] = React.useState(role !== "ba");

  // Fetch window depends on view. Day = single day; week = 7 days.
  const rangeStart = view === "day" ? anchor : anchor;
  const rangeEnd =
    view === "day" ? addDays(anchor, 1) : addDays(anchor, 7);

  const { data: calendarData = [], isLoading } = useAppointmentCalendar(
    rangeStart.toISOString(),
    rangeEnd.toISOString(),
    role !== "ba" ? { storeView } : undefined,
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
    setAnchor((d) => addDays(d, direction * (view === "day" ? 1 : 7)));
  }

  function goToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setAnchor(view === "day" ? today : getMonday(today));
  }

  function changeView(v: CalendarView) {
    // When switching to week, snap to the Monday of the current anchor so
    // the user doesn't lose context.
    if (v === "week") setAnchor((a) => getMonday(a));
    setView(v);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-12">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={goToday}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Hoy
          </button>
          <div className="flex items-center gap-1">
            <IconButton aria-label="Anterior" onClick={() => shift(-1)}>
              <ChevronLeftIcon className="size-4" />
            </IconButton>
            <IconButton aria-label="Siguiente" onClick={() => shift(1)}>
              <ChevronRightIcon className="size-4" />
            </IconButton>
          </div>
          <h1 className="font-heading text-xl tracking-tight text-foreground first-letter:uppercase">
            {formatRangeLabel(anchor, view)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Store / Mine toggle — managers only */}
          {role !== "ba" && (
            <ViewSwitch
              value={storeView ? "store" : "mine"}
              onChange={(v) => setStoreView(v === "store")}
              items={[
                { value: "mine", label: "Mis citas" },
                { value: "store", label: "Tienda" },
              ]}
            />
          )}

          <ViewSwitch
            value={view}
            onChange={(v) => changeView(v as CalendarView)}
            items={[
              { value: "day", label: "Día" },
              { value: "week", label: "Semana" },
            ]}
          />

          {can(role, "appointment.create") && (
            <Button
              onClick={() =>
                setSheet({ mode: "create", defaultStartsAt: null })
              }
            >
              Nueva cita
            </Button>
          )}
        </div>
      </header>

      {/* ── Calendar ────────────────────────────────────────────── */}
      <TimeGridCalendar
        view={view}
        anchor={anchor}
        appointments={calendarData}
        isLoading={isLoading}
        showBa={storeView && role !== "ba"}
        onAppointmentClick={(appt) => {
          setStatusUpdate(appt.status);
          setSheet({ mode: "detail", appointment: appt });
        }}
        onSlotClick={(iso) => {
          if (!can(role, "appointment.create")) return;
          setSheet({ mode: "create", defaultStartsAt: iso });
        }}
      />

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
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    Cliente
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-lg text-foreground">
                      {sheet.appointment.customerName ?? "Sin nombre"}
                    </span>
                    {sheet.appointment.customerSegment && (
                      <Badge
                        variant={
                          SEGMENT_VARIANT[sheet.appointment.customerSegment] ??
                          "secondary"
                        }
                        size="sm"
                      >
                        {SEGMENT_LABEL[sheet.appointment.customerSegment] ??
                          sheet.appointment.customerSegment}
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
                      href={`/clientes/${sheet.appointment.customerId}`}
                      className="mt-2 inline-block text-xs font-medium text-accent hover:text-accent/80"
                    >
                      Ver perfil completo →
                    </Link>
                  )}
                </div>

                <dl className="space-y-3 text-sm">
                  <Row label="Tipo de evento">
                    <div className="flex items-center gap-2">
                      {sheet.appointment.eventTypeColor && (
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            backgroundColor: sheet.appointment.eventTypeColor,
                          }}
                        />
                      )}
                      <span>{sheet.appointment.eventTypeName ?? "Evento"}</span>
                    </div>
                  </Row>

                  <Row label="Fecha y hora">
                    <span className="first-letter:uppercase">
                      {new Date(sheet.appointment.scheduledAt).toLocaleDateString(
                        "es-MX",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  </Row>

                  <Row label="Duración">
                    <span>{sheet.appointment.durationMinutes} min</span>
                  </Row>

                  <Row label="Beauty Advisor">
                    <span>{sheet.appointment.baName ?? "Sin asignar"}</span>
                  </Row>

                  <Row label="Tienda">
                    <span>{sheet.appointment.storeName ?? "—"}</span>
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

                  {sheet.appointment.comments && (
                    <div>
                      <dt className="mb-1 text-muted-foreground">
                        Comentarios
                      </dt>
                      <dd className="rounded-xl bg-muted/30 p-3 text-sm">
                        {sheet.appointment.comments}
                      </dd>
                    </div>
                  )}
                </dl>

                {can(role, "appointment.edit") && (
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
                )}
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

      {/* ── Create sheet — reuses the wizard from the customer profile ── */}
      <AppointmentSheet
        open={sheet?.mode === "create"}
        onOpenChange={(open) => !open && setSheet(null)}
        baUserId={user.id}
        defaultStartsAt={
          sheet?.mode === "create" ? sheet.defaultStartsAt : null
        }
      />
    </div>
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
    <div className="inline-flex gap-0.5 rounded-xl border border-border bg-muted/20 p-0.5">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-lg px-3 py-1 text-[12px] font-medium transition-all duration-150",
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
      className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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

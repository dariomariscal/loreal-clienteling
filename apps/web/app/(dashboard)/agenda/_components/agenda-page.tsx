"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAppointmentCalendar,
  useUpdateAppointment,
  type CalendarAppointment,
} from "@/lib/hooks";
import { useAppointmentMetrics } from "@/lib/hooks/use-analytics";
import { APPOINTMENT_STATUSES } from "@loreal/contracts";
import { can } from "@/lib/permissions";
import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
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
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentsIllustration } from "@/components/ui/illustrations";
import { WeekCalendar } from "./week-calendar";
import { STATUS_LABEL, STATUS_VARIANT } from "./appointment-card";

// ── Helpers ────────────────────────────────────────────────────────

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

function formatDateRange(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const startStr = start.toLocaleDateString("es-MX", opts);
  const endStr = end.toLocaleDateString("es-MX", {
    ...opts,
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

const SEGMENT_LABEL: Record<string, string> = {
  new: "Nueva",
  returning: "Recurrente",
  vip: "VIP",
  at_risk: "En riesgo",
};

const SEGMENT_VARIANT: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
  new: "info",
  returning: "secondary",
  vip: "success",
  at_risk: "warning",
};

// ── Types ──────────────────────────────────────────────────────────

type SheetState = null | { mode: "detail"; appointment: CalendarAppointment };

// ── Component ──────────────────────────────────────────────────────

interface AgendaPageProps {
  user: { role?: string | null };
}

export function AgendaPage({ user }: AgendaPageProps) {
  const role = user.role ?? "ba";
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [sheet, setSheet] = useState<SheetState>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [storeView, setStoreView] = useState(role !== "ba");

  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  const { data: calendarData = [], isLoading } = useAppointmentCalendar(
    from,
    to,
    role !== "ba" ? { storeView } : undefined,
  );

  const { data: metrics } = useAppointmentMetrics(from, to);
  const { open: openCreate } = useCreateMenu();
  const updateAppointment = useUpdateAppointment();

  function handleStatusChange() {
    if (sheet?.mode !== "detail" || !statusUpdate) return;
    updateAppointment.mutate(
      {
        id: sheet.appointment.id,
        status: statusUpdate,
      },
      { onSuccess: () => setSheet(null) },
    );
  }

  const isPending = updateAppointment.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Agenda"
        description="Citas y servicios programados"
        action={
          can(role, "appointment.create") ? (
            <Button onClick={() => openCreate("appointment")}>
              Nueva cita
            </Button>
          ) : undefined
        }
      />

      {/* Store / Mine toggle — visible for manager+ */}
      {role !== "ba" && (
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setStoreView(true)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                storeView
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tienda
            </button>
            <button
              onClick={() => setStoreView(false)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !storeView
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mis citas
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            {calendarData.length} cita{calendarData.length !== 1 ? "s" : ""} esta semana
          </span>
        </div>
      )}

      {/* Metrics summary cards */}
      {metrics && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniMetric label="Total" value={metrics.total} />
          <MiniMetric label="Completadas" value={metrics.completed} variant="success" />
          <MiniMetric label="Confirmadas" value={metrics.confirmed} variant="info" />
          <MiniMetric label="Canceladas" value={metrics.cancelled} variant="destructive" />
          <MiniMetric label="No asistió" value={metrics.noShow} variant="warning" />
          <MiniMetric label="Reagendadas" value={metrics.rescheduled} />
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ← Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Siguiente →
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(getMonday(new Date()))}
          >
            Hoy
          </Button>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {formatDateRange(weekStart)}
        </span>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="grid h-[300px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-card p-2">
              <div className="h-4 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      ) : calendarData.length === 0 ? (
        <EmptyState
          illustration={<AppointmentsIllustration className="w-full" />}
          title="Sin citas esta semana"
          description="Cuando agendas una cita aparece aquí. Empieza programando la primera."
          action={
            can(role, "appointment.create") ? (
              <Button onClick={() => openCreate("appointment")}>
                Crear primera cita
              </Button>
            ) : undefined
          }
        />
      ) : (
        <WeekCalendar
          appointments={calendarData}
          weekStart={weekStart}
          showBa={storeView && role !== "ba"}
          onAppointmentClick={(appt) => {
            setStatusUpdate(appt.status);
            setSheet({ mode: "detail", appointment: appt });
          }}
        />
      )}

      {/* Detail Sheet — read-only with status update */}
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
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">
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
                    <div className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                      {sheet.appointment.customerPhone}
                    </div>
                  )}
                  {sheet.appointment.customerId && (
                    <Link
                      href={`/clientes/${sheet.appointment.customerId}`}
                      className="mt-1 inline-block text-xs font-medium text-accent hover:text-accent/80"
                    >
                      Ver perfil completo →
                    </Link>
                  )}
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tipo de evento</dt>
                    <dd className="flex items-center gap-2">
                      {sheet.appointment.eventTypeColor && (
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            backgroundColor: sheet.appointment.eventTypeColor,
                          }}
                        />
                      )}
                      <Badge variant="secondary">
                        {sheet.appointment.eventTypeName ?? "Evento"}
                      </Badge>
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Fecha y hora</dt>
                    <dd className="font-medium">
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
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd>{sheet.appointment.durationMinutes} min</dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Beauty Advisor</dt>
                    <dd className="font-medium">
                      {sheet.appointment.baName ?? "Sin asignar"}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tienda</dt>
                    <dd>{sheet.appointment.storeName ?? "—"}</dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd>
                      <Badge
                        variant={
                          STATUS_VARIANT[sheet.appointment.status] ?? "secondary"
                        }
                      >
                        {STATUS_LABEL[sheet.appointment.status] ??
                          sheet.appointment.status}
                      </Badge>
                    </dd>
                  </div>

                  {sheet.appointment.isVirtual && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Modalidad</dt>
                      <dd>
                        <Badge variant="info" size="sm">
                          Virtual
                        </Badge>
                      </dd>
                    </div>
                  )}

                  {sheet.appointment.comments && (
                    <div>
                      <dt className="mb-1 text-muted-foreground">Comentarios</dt>
                      <dd className="rounded-md bg-muted/30 p-2 text-sm">
                        {sheet.appointment.comments}
                      </dd>
                    </div>
                  )}
                </dl>

                {can(role, "appointment.edit") && (
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      Cambiar estado
                    </span>
                    <div className="flex gap-2">
                      <Select
                        value={statusUpdate}
                        onValueChange={(v) => setStatusUpdate(v ?? "")}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar estado">
                            {statusUpdate
                              ? (STATUS_LABEL[statusUpdate] ?? statusUpdate)
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
                        {isPending ? "Guardando..." : "Actualizar"}
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
    </div>
  );
}

// ── Mini metric card for summary bar ───────────────────────────────

function MiniMetric({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "success" | "info" | "warning" | "destructive";
}) {
  return (
    <Card className="p-0">
      <CardContent className="px-3 py-2">
        <CardDescription className="text-[11px]">{label}</CardDescription>
        <div className={`text-lg font-semibold tabular-nums ${
          variant === "success" ? "text-green-600" :
          variant === "destructive" ? "text-red-500" :
          variant === "warning" ? "text-amber-500" :
          variant === "info" ? "text-blue-500" :
          ""
        }`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

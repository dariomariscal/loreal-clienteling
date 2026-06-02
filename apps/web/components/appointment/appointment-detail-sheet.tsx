"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/advisor/section-card";
import {
  useAppointment,
  type CalendarAppointment,
} from "@/lib/hooks/use-appointments";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  APPOINTMENT_OUTCOME_LABEL,
  APPOINTMENT_OUTCOME_VARIANT,
  CUSTOMER_SEGMENT_LABEL,
  CUSTOMER_SEGMENT_VARIANT,
} from "@/lib/appointments/labels";
import { AppointmentLifecycleActions } from "./appointment-lifecycle-actions";
import { AppointmentIdeabook } from "./appointment-ideabook";
import { CustomerConfirmationCard } from "./customer-confirmation-card";
import { CheckOutSheet } from "./check-out-sheet";
import { AppointmentReasonSheet } from "./appointment-reason-sheet";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

interface AppointmentDetailSheetProps {
  /** Calendar-row payload — used for instant render while full data loads. */
  appointment: CalendarAppointment | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Orchestrator for the appointment detail sheet. Composes:
 *
 *   1. Customer hero (avatar / lifecycle / phone / deep link)
 *   2. Appointment facts (service, time, status, outcome)
 *   3. Lifecycle actions (check-in / cancel / no-show / check-out)
 *   4. Customer confirmation card (manual "log customer reply")
 *   5. Ideabook (prepared products with status lifecycle)
 *   6. Notes
 *
 * The orchestrator owns ONLY the cross-section sheet routing (which sub-sheet
 * is open: check-out, cancel, no-show). Every domain section owns its own
 * mutations via `useAppointmentLifecycle`. No global state, no context — the
 * parent passes a `CalendarAppointment` and we hydrate the full appointment
 * via React Query (cache-shared).
 *
 * Industry naming: "Appointment Detail" / "Card" — directly from Tulip and
 * BSPK documentation. The structure mirrors what Tulip Clienteling Advisor
 * surfaces when a BA taps a card in the Today timeline.
 */
export function AppointmentDetailSheet({
  appointment,
  onOpenChange,
}: AppointmentDetailSheetProps) {
  const [subSheet, setSubSheet] = React.useState<
    "check_out" | "cancel" | "no_show" | null
  >(null);

  // Fetch the full appointment to access outcome_code, confirmed_by_customer_at,
  // notes — fields the calendar payload doesn't carry.
  const { data: full } = useAppointment(appointment?.id ?? "");

  const open = appointment !== null && subSheet === null;
  const status = (full?.status ?? appointment?.status) as AppointmentStatus;
  const outcomeCode = full?.outcomeCode ?? null;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false);
        }}
      >
        <SheetContent size="default">
          <SheetHeader>
            <SheetTitle>Detalle de cita</SheetTitle>
          </SheetHeader>

          {appointment && (
            <SheetBody>
              <div className="space-y-5">
                <CustomerHero appointment={appointment} />

                <AppointmentFacts
                  appointment={appointment}
                  status={status}
                  outcomeCode={outcomeCode}
                />

                <SectionCard title="Acciones">
                  <div className="px-4 pb-3 pt-1">
                    <AppointmentLifecycleActions
                      appointmentId={appointment.id}
                      status={status}
                      onCheckOut={() => setSubSheet("check_out")}
                      onCancel={() => setSubSheet("cancel")}
                      onMarkNoShow={() => setSubSheet("no_show")}
                    />
                  </div>
                </SectionCard>

                <CustomerConfirmationCard
                  appointmentId={appointment.id}
                  confirmedAt={full?.confirmedByCustomerAt ?? null}
                  disabled={isTerminal(status)}
                  onCancel={() => setSubSheet("cancel")}
                />

                <AppointmentIdeabook
                  appointmentId={appointment.id}
                  readOnly={isTerminal(status)}
                />

                {appointment.notes ? (
                  <SectionCard title="Notas">
                    <p className="px-4 pb-3 pt-1 text-sm leading-relaxed text-foreground/85">
                      {appointment.notes}
                    </p>
                  </SectionCard>
                ) : null}
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

      {appointment ? (
        <>
          <CheckOutSheet
            appointmentId={appointment.id}
            open={subSheet === "check_out"}
            onOpenChange={(next) => setSubSheet(next ? "check_out" : null)}
          />
          <AppointmentReasonSheet
            appointmentId={appointment.id}
            kind={
              subSheet === "cancel"
                ? "cancel"
                : subSheet === "no_show"
                  ? "no_show"
                  : null
            }
            onOpenChange={(next) => !next && setSubSheet(null)}
          />
        </>
      ) : null}
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────

function CustomerHero({ appointment }: { appointment: CalendarAppointment }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Clienta
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-lg text-foreground">
          {appointment.customerName ?? "Sin nombre"}
        </span>
        {appointment.customerLifecycleStage && (
          <Badge
            variant={
              CUSTOMER_SEGMENT_VARIANT[appointment.customerLifecycleStage] ??
              "secondary"
            }
            size="sm"
          >
            {CUSTOMER_SEGMENT_LABEL[appointment.customerLifecycleStage] ??
              appointment.customerLifecycleStage}
          </Badge>
        )}
      </div>
      {appointment.customerPhone && (
        <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
          {appointment.customerPhone}
        </p>
      )}
      {appointment.customerId && (
        <Link
          href={`/advisor/customers/${appointment.customerId}`}
          className="mt-2 inline-block text-xs font-medium text-[color:var(--ba-accent)] hover:opacity-80"
        >
          Ver perfil completo →
        </Link>
      )}
    </div>
  );
}

// ── Facts ─────────────────────────────────────────────────────────

function AppointmentFacts({
  appointment,
  status,
  outcomeCode,
}: {
  appointment: CalendarAppointment;
  status: AppointmentStatus;
  outcomeCode: string | null;
}) {
  return (
    <dl className="space-y-3 text-sm">
      <Row label="Tipo de servicio">
        <div className="flex items-center gap-2">
          {appointment.serviceTypeColor && (
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: appointment.serviceTypeColor }}
            />
          )}
          <span>{appointment.serviceTypeName ?? "Servicio"}</span>
        </div>
      </Row>

      <Row label="Fecha y hora">
        <span className="first-letter:uppercase">
          {new Date(appointment.startTime).toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </Row>

      <Row label="Duración">
        <span>{appointment.durationMinutes} min</span>
      </Row>

      <Row label="Estado">
        <Badge variant={APPOINTMENT_STATUS_VARIANT[status] ?? "secondary"}>
          {APPOINTMENT_STATUS_LABEL[status] ?? status}
        </Badge>
      </Row>

      {outcomeCode &&
      outcomeCode in APPOINTMENT_OUTCOME_LABEL ? (
        <Row label="Resultado">
          <Badge
            variant={
              APPOINTMENT_OUTCOME_VARIANT[
                outcomeCode as keyof typeof APPOINTMENT_OUTCOME_VARIANT
              ] ?? "secondary"
            }
          >
            {
              APPOINTMENT_OUTCOME_LABEL[
                outcomeCode as keyof typeof APPOINTMENT_OUTCOME_LABEL
              ]
            }
          </Badge>
        </Row>
      ) : null}

      {appointment.isVirtual && (
        <Row label="Modalidad">
          <Badge variant="info" size="sm">
            Virtual
          </Badge>
        </Row>
      )}
    </dl>
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

function isTerminal(status: AppointmentStatus): boolean {
  return (
    status === "completed" || status === "cancelled" || status === "no_show"
  );
}

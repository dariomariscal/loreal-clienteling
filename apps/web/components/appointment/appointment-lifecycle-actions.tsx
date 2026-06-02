"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useAppointmentLifecycle } from "@/lib/appointments/use-appointment-lifecycle";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

interface AppointmentLifecycleActionsProps {
  appointmentId: string;
  status: AppointmentStatus;
  /** Opens the dedicated check-out sheet (outcome + notes). */
  onCheckOut: () => void;
  /** Opens the cancellation flow (needs a reason). */
  onCancel: () => void;
  /** Opens the no-show flow (needs a reason). */
  onMarkNoShow: () => void;
}

/**
 * Contextual action bar — the "primary CTA" of the appointment detail.
 *
 * BSPK / Tulip pattern: ONE prominent button matching the next expected
 * step in the lifecycle, plus a secondary "everything else" path. The set
 * is computed from the current status so the BA always sees the right
 * action without scanning a long menu.
 *
 * State machine summary (see api/appointments.service.ts for source-of-truth):
 *
 *   scheduled  →  Check-in  |  Mark no-show
 *   confirmed  →  Check-in  |  Mark no-show          (customer already RSVP'd)
 *   in-visit*  →  Close cita  (handled by status=confirmed + open visit row)
 *   completed  →  (no actions — read-only)
 *   cancelled  →  (no actions — read-only)
 *   no_show    →  (no actions — read-only)
 *
 *   *the API uses confirmed+open visit to represent "in-visit"; this UI
 *   surfaces the "Cerrar cita" CTA whenever the appointment is past its
 *   start time or has an open visit (handled by parent via `onCheckOut`).
 */
export function AppointmentLifecycleActions({
  appointmentId,
  status,
  onCheckOut,
  onCancel,
  onMarkNoShow,
}: AppointmentLifecycleActionsProps) {
  const lifecycle = useAppointmentLifecycle(appointmentId);

  if (status === "completed" || status === "cancelled" || status === "no_show") {
    return null;
  }

  const canCheckIn = status === "scheduled" || status === "confirmed";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {canCheckIn ? (
        <Button
          type="button"
          size="default"
          disabled={lifecycle.isPending}
          onClick={() => lifecycle.checkIn()}
        >
          La clienta llegó
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={lifecycle.isPending}
        onClick={onCheckOut}
      >
        Cerrar cita
      </Button>

      {canCheckIn ? (
        <Button
          type="button"
          variant="ghost"
          size="default"
          disabled={lifecycle.isPending}
          onClick={onMarkNoShow}
          className="text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          No asistió
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="default"
        disabled={lifecycle.isPending}
        onClick={onCancel}
      >
        Cancelar cita
      </Button>
    </div>
  );
}

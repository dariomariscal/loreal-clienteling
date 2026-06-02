"use client";

import {
  useCancelAppointment,
  useMarkAppointmentNoShow,
  useConfirmAppointmentByCustomer,
  useCheckInAppointment,
  useCheckOutAppointment,
} from "@/lib/hooks/use-appointments";
import type {
  CancelAppointment,
  MarkAppointmentNoShow,
  CheckOutAppointment,
} from "@loreal/contracts";

/**
 * Composite hook that bundles every lifecycle mutation for a single
 * appointment so callers don't need to wire 5 mutations by hand.
 *
 * Industry naming: each handler is the verb the BSPK/Tulip UI uses —
 * `confirm`, `checkIn`, `checkOut`, `cancel`, `markNoShow`. The hook is
 * intentionally thin: it doesn't own state, doesn't toast, doesn't redirect.
 * Components decide what to do after a mutation settles.
 *
 * Why a hook (not a class / service): every mutation already comes from
 * React Query with cache-invalidation wired. Wrapping them gives a single
 * `isPending` flag and a single `error` surface without re-implementing
 * any of that infra (KISS).
 */
export function useAppointmentLifecycle(appointmentId: string) {
  const cancel = useCancelAppointment();
  const markNoShow = useMarkAppointmentNoShow();
  const confirmByCustomer = useConfirmAppointmentByCustomer();
  const checkIn = useCheckInAppointment();
  const checkOut = useCheckOutAppointment();

  const isPending =
    cancel.isPending ||
    markNoShow.isPending ||
    confirmByCustomer.isPending ||
    checkIn.isPending ||
    checkOut.isPending;

  const error =
    cancel.error ??
    markNoShow.error ??
    confirmByCustomer.error ??
    checkIn.error ??
    checkOut.error ??
    null;

  return {
    isPending,
    error,
    /** Customer confirmed via SMS / WhatsApp / phone — sets confirmed_by_customer_at. */
    confirm: (confirmedAt?: Date) =>
      confirmByCustomer.mutateAsync({ id: appointmentId, confirmedAt }),
    /** BA logs that the customer just arrived — opens a customer_visits row. */
    checkIn: () => checkIn.mutateAsync({ id: appointmentId }),
    /** Close the appointment with outcome — seeds 3 auto follow-ups server-side. */
    checkOut: (input: CheckOutAppointment) =>
      checkOut.mutateAsync({ id: appointmentId, ...input }),
    /** Cancel with a reason (BSPK convention — "Cancellation reason required"). */
    cancel: (input: CancelAppointment) =>
      cancel.mutateAsync({ id: appointmentId, ...input }),
    /** Customer didn't show after the scheduled start. */
    markNoShow: (input: MarkAppointmentNoShow) =>
      markNoShow.mutateAsync({ id: appointmentId, ...input }),
  };
}

export type AppointmentLifecycle = ReturnType<typeof useAppointmentLifecycle>;

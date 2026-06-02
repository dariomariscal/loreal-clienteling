/**
 * Single source of truth for human-readable labels + Badge variants used by
 * the appointment lifecycle UI.
 *
 * Industry naming: every key matches what the backend stores; values follow
 * Sephora / Tulip / BSPK Spanish-MX retail conventions ("Programada",
 * "Confirmada", "No asistió"), avoiding both DB jargon and over-translation.
 *
 * DO NOT inline these maps in components — add new entries here when the
 * backend taxonomy grows so the UI stays in sync in one place.
 */

import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_OUTCOME_CODES,
  APPOINTMENT_CANCELLATION_REASONS,
  APPOINTMENT_NO_SHOW_REASONS,
  PREPARED_PRODUCT_STATUSES,
} from "@loreal/contracts";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "info"
  | "success"
  | "warning";

// ── Appointment status ─────────────────────────────────────────────

export const APPOINTMENT_STATUS_LABEL: Record<
  (typeof APPOINTMENT_STATUSES)[number],
  string
> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

export const APPOINTMENT_STATUS_VARIANT: Record<
  (typeof APPOINTMENT_STATUSES)[number],
  BadgeVariant
> = {
  scheduled: "default",
  confirmed: "info",
  rescheduled: "warning",
  cancelled: "destructive",
  completed: "success",
  no_show: "destructive",
};

// ── Outcome code ───────────────────────────────────────────────────

export const APPOINTMENT_OUTCOME_LABEL: Record<
  (typeof APPOINTMENT_OUTCOME_CODES)[number],
  string
> = {
  sale_closed: "Venta cerrada",
  sample_given: "Muestra entregada",
  future_intent: "Interés futuro",
  no_purchase: "Sin compra",
  referred_out: "Referida a otra asesora",
};

export const APPOINTMENT_OUTCOME_VARIANT: Record<
  (typeof APPOINTMENT_OUTCOME_CODES)[number],
  BadgeVariant
> = {
  sale_closed: "success",
  sample_given: "info",
  future_intent: "warning",
  no_purchase: "secondary",
  referred_out: "outline",
};

// One-line tooltips for the OutcomeRadioGroup — keeps the radio compact.
export const APPOINTMENT_OUTCOME_HINT: Record<
  (typeof APPOINTMENT_OUTCOME_CODES)[number],
  string
> = {
  sale_closed: "La clienta compró durante la cita.",
  sample_given: "Se entregaron muestras para probar en casa.",
  future_intent: "No compró hoy, mostró interés para volver.",
  no_purchase: "No hubo venta ni intención clara.",
  referred_out: "Otra asesora atendió o tomará la relación.",
};

// ── Cancellation reasons ───────────────────────────────────────────

export const APPOINTMENT_CANCELLATION_REASON_LABEL: Record<
  (typeof APPOINTMENT_CANCELLATION_REASONS)[number],
  string
> = {
  customer_request: "Petición de la clienta",
  scheduling_conflict: "Conflicto de agenda",
  sick: "Enfermedad",
  weather: "Clima",
  store_closed: "Tienda cerrada",
  duplicate: "Duplicada",
  other: "Otra",
};

// ── No-show reasons ────────────────────────────────────────────────

export const APPOINTMENT_NO_SHOW_REASON_LABEL: Record<
  (typeof APPOINTMENT_NO_SHOW_REASONS)[number],
  string
> = {
  forgot: "Se le olvidó",
  running_late_gave_up: "Se le hizo tarde y desistió",
  found_alternative: "Encontró otra opción",
  unknown: "Sin información",
  other: "Otra",
};

// ── Prepared product (ideabook) status ─────────────────────────────

export const PREPARED_PRODUCT_STATUS_LABEL: Record<
  (typeof PREPARED_PRODUCT_STATUSES)[number],
  string
> = {
  prepared: "Preparado",
  shown: "Mostrado",
  tried: "Probado",
  purchased: "Comprado",
  declined: "Descartado",
};

export const PREPARED_PRODUCT_STATUS_VARIANT: Record<
  (typeof PREPARED_PRODUCT_STATUSES)[number],
  BadgeVariant
> = {
  prepared: "outline",
  shown: "info",
  tried: "warning",
  purchased: "success",
  declined: "secondary",
};

// ── Customer lifecycle / segment (kept here so callers don't duplicate) ──

export const CUSTOMER_SEGMENT_LABEL: Record<string, string> = {
  new: "Nueva",
  returning: "Recurrente",
  vip: "VIP",
  at_risk: "En riesgo",
};

export const CUSTOMER_SEGMENT_VARIANT: Record<string, BadgeVariant> = {
  new: "info",
  returning: "secondary",
  vip: "success",
  at_risk: "warning",
};

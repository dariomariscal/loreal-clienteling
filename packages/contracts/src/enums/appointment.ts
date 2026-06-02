export const AppointmentStatus = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  RESCHEDULED: "rescheduled",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
} as const;

export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const APPOINTMENT_STATUSES = Object.values(AppointmentStatus);

/**
 * Queryable outcome captured at check-out. Mirrors the customer_visits
 * outcome taxonomy so funnel reporting works without joining jsonb.
 */
export const AppointmentOutcomeCode = {
  SALE_CLOSED: "sale_closed",
  SAMPLE_GIVEN: "sample_given",
  FUTURE_INTENT: "future_intent",
  NO_PURCHASE: "no_purchase",
  REFERRED_OUT: "referred_out",
} as const;

export type AppointmentOutcomeCode =
  (typeof AppointmentOutcomeCode)[keyof typeof AppointmentOutcomeCode];

export const APPOINTMENT_OUTCOME_CODES = Object.values(AppointmentOutcomeCode);

/**
 * Why a customer / staff cancelled the appointment. Drives the analytics
 * funnel ("why are we losing bookings before they happen?").
 */
export const AppointmentCancellationReason = {
  CUSTOMER_REQUEST: "customer_request",
  SCHEDULING_CONFLICT: "scheduling_conflict",
  SICK: "sick",
  WEATHER: "weather",
  STORE_CLOSED: "store_closed",
  DUPLICATE: "duplicate",
  OTHER: "other",
} as const;

export type AppointmentCancellationReason =
  (typeof AppointmentCancellationReason)[keyof typeof AppointmentCancellationReason];

export const APPOINTMENT_CANCELLATION_REASONS = Object.values(
  AppointmentCancellationReason,
);

/**
 * Why a customer didn't show up after confirming. Lets us tune reminders
 * (e.g. "forgot" volume rising → push reminder closer to start time).
 */
export const AppointmentNoShowReason = {
  FORGOT: "forgot",
  RUNNING_LATE_GAVE_UP: "running_late_gave_up",
  FOUND_ALTERNATIVE: "found_alternative",
  UNKNOWN: "unknown",
  OTHER: "other",
} as const;

export type AppointmentNoShowReason =
  (typeof AppointmentNoShowReason)[keyof typeof AppointmentNoShowReason];

export const APPOINTMENT_NO_SHOW_REASONS = Object.values(
  AppointmentNoShowReason,
);

/**
 * Lifecycle of an item the BA pre-selected for an appointment ("ideabook"
 * / "look book" pattern from BSPK / Tulip).
 */
export const PreparedProductStatus = {
  PREPARED: "prepared",
  SHOWN: "shown",
  TRIED: "tried",
  PURCHASED: "purchased",
  DECLINED: "declined",
} as const;

export type PreparedProductStatus =
  (typeof PreparedProductStatus)[keyof typeof PreparedProductStatus];

export const PREPARED_PRODUCT_STATUSES = Object.values(PreparedProductStatus);

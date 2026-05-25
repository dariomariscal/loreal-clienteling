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
 * Built-in service type codes. Retailers can add their own via
 * service_types table — this constant is just the seeded defaults.
 */
export const BuiltInServiceType = {
  CABIN_SERVICE: "cabin_service",
  FACIAL: "facial",
  ANNIVERSARY_EVENT: "anniversary_event",
  VIP_CABIN: "vip_cabin",
  PRODUCT_FOLLOWUP: "product_followup",
  CUSTOM: "custom",
} as const;

export type BuiltInServiceType =
  (typeof BuiltInServiceType)[keyof typeof BuiltInServiceType];

export const BUILT_IN_SERVICE_TYPES = Object.values(BuiltInServiceType);

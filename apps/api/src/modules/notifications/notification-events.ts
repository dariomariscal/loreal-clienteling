/**
 * Event names emitted across the API to feed the notification listeners.
 * Keep all event keys in one file so producers and consumers can't drift.
 *
 * Convention: `<entity>.<verb>` (NestJS / EventEmitter2 style). Listeners
 * subscribe via `@OnEvent('messages.received')` and receive the typed
 * payload below.
 */
export const NotificationEvents = {
  /** Inbound message from a customer. */
  MESSAGE_RECEIVED: "messages.received",
  /** Provider webhook reported a read receipt on an outbound message. */
  MESSAGE_READ: "messages.read",
  /** Counter manager approved or rejected a request raised by a BA. */
  APPROVAL_DECIDED: "approval_requests.decided",
  /** A customer submitted (or a manager attested) a rating for a BA. */
  BA_RATING_CREATED: "ba_ratings.created",
  /** Appointment changed status (confirmed / cancelled / rescheduled). */
  APPOINTMENT_STATUS_CHANGED: "appointments.status_changed",
  /** New customer visit row inserted — covers walk-ins and check-ins. */
  CUSTOMER_VISIT_STARTED: "customer_visits.started",
  /** Customer was assigned to a BA (manual or auto). */
  CUSTOMER_ASSIGNED: "customers.assigned",
} as const;

export type NotificationEventName =
  (typeof NotificationEvents)[keyof typeof NotificationEvents];

// ─── Event payloads ─────────────────────────────────────────────────────

export interface MessageReceivedEvent {
  messageId: string;
  customerId: string;
  /** BA who owns this customer — may be null if the customer is unassigned. */
  assignedToUserId: string | null;
  channel: string;
  preview: string;
}

export interface MessageReadEvent {
  messageId: string;
  /** BA who sent the original message. */
  sentByUserId: string;
  customerId: string;
}

export interface ApprovalDecidedEvent {
  approvalRequestId: string;
  /** BA who raised the request — recipient of the notification. */
  requestedByUserId: string;
  decision: "approved" | "rejected";
  type: string;
  customerId: string | null;
}

export interface BaRatingCreatedEvent {
  baRatingId: string;
  /** BA being reviewed — recipient of the notification. */
  reviewedUserId: string;
  customerId: string;
  score: number;
}

export interface AppointmentStatusChangedEvent {
  appointmentId: string;
  /** BA owning the appointment. */
  staffUserId: string;
  customerId: string;
  previousStatus: string;
  newStatus: string;
  startTime: Date;
}

export interface CustomerVisitStartedEvent {
  visitId: string;
  customerId: string;
  /** BA who registered the visit. */
  attendedByUserId: string;
  /** Customer's assigned BA, if different from the attendee — they also care. */
  assignedToUserId: string | null;
  isVip: boolean;
}

export interface CustomerAssignedEvent {
  customerId: string;
  /** New BA who got the customer. */
  assignedToUserId: string;
  /** Previous owner, or null if unassigned before. */
  previousAssignedToUserId: string | null;
}

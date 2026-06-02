/**
 * Discriminator for what produced a notification. Drives the icon, default
 * priority, and which preference toggle controls it. Mirrors the 17 alert
 * kinds documented in the BA clienteling research.
 *
 * Grouped by tier (urgency) so the service can apply sensible defaults:
 *
 *   urgent  → push by default, sound on
 *   high    → in-app + optional push
 *   normal  → in-app only by default
 */
export const NotificationKind = {
  // Urgent — "attend now"
  CUSTOMER_REPLY: "customer_reply",
  APPOINTMENT_IMMINENT: "appointment_imminent",
  CUSTOMER_ARRIVED: "customer_arrived",
  APPROVAL_DECIDED: "approval_decided",

  // High — "do today"
  DAILY_ACTIONS_READY: "daily_actions_ready",
  FOLLOWUP_OVERDUE: "followup_overdue",
  WISHLIST_BACK_IN_STOCK: "wishlist_back_in_stock",
  WISHLIST_PRICE_DROP: "wishlist_price_drop",
  RESERVATION_EXPIRING: "reservation_expiring",
  MESSAGE_READ: "message_read",

  // Normal — "good to know"
  BIRTHDAY_TODAY: "birthday_today",
  SAMPLE_FOLLOWUP_DUE: "sample_followup_due",
  DORMANT_CUSTOMER: "dormant_customer",
  ABANDONED_CART: "abandoned_cart",
  REPLENISHMENT_DUE: "replenishment_due",
  BA_RATING_RECEIVED: "ba_rating_received",
  NEW_CUSTOMER_ASSIGNED: "new_customer_assigned",
} as const;

export type NotificationKind =
  (typeof NotificationKind)[keyof typeof NotificationKind];

export const NOTIFICATION_KINDS = Object.values(NotificationKind);

/**
 * Urgency tier — drives default sound / banner / push policy on the client.
 */
export const NotificationPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type NotificationPriority =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NOTIFICATION_PRIORITIES = Object.values(NotificationPriority);

/**
 * Default priority per kind. The service uses this when the caller doesn't
 * pass an explicit priority. Kept in one place so UI and backend agree.
 */
export const NOTIFICATION_DEFAULT_PRIORITY: Record<
  NotificationKind,
  NotificationPriority
> = {
  customer_reply: "urgent",
  appointment_imminent: "urgent",
  customer_arrived: "urgent",
  approval_decided: "urgent",

  daily_actions_ready: "high",
  followup_overdue: "high",
  wishlist_back_in_stock: "high",
  wishlist_price_drop: "high",
  reservation_expiring: "high",
  message_read: "low",

  birthday_today: "normal",
  sample_followup_due: "normal",
  dormant_customer: "normal",
  abandoned_cart: "normal",
  replenishment_due: "normal",
  ba_rating_received: "normal",
  new_customer_assigned: "normal",
};

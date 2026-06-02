import type {
  NotificationKind,
  NotificationPriority,
} from "../enums/notification";

/**
 * One delivered alert for a Beauty Advisor. Returned by the inbox / bell
 * dropdown / full-page list endpoints. Mirrors the DB row 1:1 plus a few
 * joined fields the UI needs to avoid a second roundtrip.
 */
export interface Notification {
  id: string;
  recipientUserId: string;
  kind: NotificationKind;
  priority: NotificationPriority;
  title: string;
  body: string;
  actionUrl: string | null;

  customerId: string | null;
  productId: string | null;
  appointmentId: string | null;
  orderId: string | null;
  suggestedActionId: string | null;
  approvalRequestId: string | null;
  baRatingId: string | null;
  visitId: string | null;

  groupKey: string | null;
  deliveredChannels: string | null;
  pushAttempts: number;

  readAt: Date | null;
  dismissedAt: Date | null;
  snoozedUntil: Date | null;
  expiresAt: Date | null;

  createdAt: Date;
}

/**
 * Notification with a denormalized customer name/avatar, returned by the
 * bell-icon dropdown so the BA can read "Maria López respondió" without
 * the UI making a second customer lookup.
 */
export interface NotificationWithCustomer extends Notification {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
}

/**
 * Payload passed to NotificationsService.create(). The service fills in
 * defaults (priority from NOTIFICATION_DEFAULT_PRIORITY, expiresAt by
 * kind) and dedupes by groupKey before insert.
 */
export interface CreateNotification {
  recipientUserId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  priority?: NotificationPriority;
  actionUrl?: string;

  customerId?: string;
  productId?: string;
  appointmentId?: string;
  orderId?: string;
  suggestedActionId?: string;
  approvalRequestId?: string;
  baRatingId?: string;
  visitId?: string;

  groupKey?: string;
  expiresAt?: Date;
}

export interface NotificationUnreadCount {
  total: number;
  urgent: number;
  high: number;
}

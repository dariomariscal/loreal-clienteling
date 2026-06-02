import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_DEFAULT_PRIORITY,
  type CreateNotification,
  type NotificationKind,
  type NotificationPreferenceResolved,
} from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import type {
  ListNotificationsQueryDto,
  UpsertNotificationPreferenceDto,
  CreatePushSubscriptionDto,
} from "../../dtos/notifications.dto";
import { NotificationsRepo } from "./notifications.repo";
import { PushService } from "./push.service";

/**
 * Default expiry per notification kind. Urgent alerts time out quickly so a
 * stale "appointment imminent" doesn't surface after the visit happened;
 * informational alerts stay around longer.
 */
const DEFAULT_EXPIRY_MINUTES: Record<NotificationKind, number> = {
  customer_reply: 60 * 24, // 24h — a reply is still worth seeing tomorrow
  appointment_imminent: 60, // 1h — past that, the appointment has happened
  customer_arrived: 60 * 4, // 4h — a single shift
  approval_decided: 60 * 24 * 3, // 3 days
  daily_actions_ready: 60 * 24, // until the next 5am cron
  followup_overdue: 60 * 24 * 7, // a week
  wishlist_back_in_stock: 60 * 24 * 7,
  wishlist_price_drop: 60 * 24 * 7,
  reservation_expiring: 60 * 48,
  message_read: 60 * 24,
  birthday_today: 60 * 24,
  sample_followup_due: 60 * 24 * 7,
  dormant_customer: 60 * 24 * 14,
  abandoned_cart: 60 * 24 * 3,
  replenishment_due: 60 * 24 * 14,
  ba_rating_received: 60 * 24 * 7,
  new_customer_assigned: 60 * 24 * 30,
};

/**
 * Default in-app + push preferences when the user has no row yet. Urgent
 * kinds get push by default; informational kinds are in-app only so the BA
 * isn't buzzed for everything.
 */
const DEFAULT_PREFERENCES: Record<
  NotificationKind,
  { inAppEnabled: boolean; pushEnabled: boolean }
> = {
  customer_reply: { inAppEnabled: true, pushEnabled: true },
  appointment_imminent: { inAppEnabled: true, pushEnabled: true },
  customer_arrived: { inAppEnabled: true, pushEnabled: true },
  approval_decided: { inAppEnabled: true, pushEnabled: true },

  daily_actions_ready: { inAppEnabled: true, pushEnabled: true },
  followup_overdue: { inAppEnabled: true, pushEnabled: false },
  wishlist_back_in_stock: { inAppEnabled: true, pushEnabled: false },
  wishlist_price_drop: { inAppEnabled: true, pushEnabled: false },
  reservation_expiring: { inAppEnabled: true, pushEnabled: false },
  message_read: { inAppEnabled: true, pushEnabled: false },

  birthday_today: { inAppEnabled: true, pushEnabled: true },
  sample_followup_due: { inAppEnabled: true, pushEnabled: false },
  dormant_customer: { inAppEnabled: true, pushEnabled: false },
  abandoned_cart: { inAppEnabled: true, pushEnabled: false },
  replenishment_due: { inAppEnabled: true, pushEnabled: false },
  ba_rating_received: { inAppEnabled: true, pushEnabled: false },
  new_customer_assigned: { inAppEnabled: true, pushEnabled: false },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NotificationsRepo) private repo: NotificationsRepo,
    @Inject(PushService) private push: PushService,
  ) {}

  // ─── Inbox / bell endpoints ───────────────────────────────────────────

  async list(query: ListNotificationsQueryDto, user: SessionUser) {
    return this.repo.list({
      recipientUserId: user.id,
      status: query.status ?? "unread",
      kind: query.kind,
      limit: query.limit ?? 50,
    });
  }

  unreadCount(user: SessionUser) {
    return this.repo.unreadCount(user.id);
  }

  async markRead(id: string, user: SessionUser) {
    const updated = await this.repo.markRead(id, user.id);
    if (!updated) throw new NotFoundException("Notification not found");
    return updated;
  }

  markAllRead(user: SessionUser) {
    return this.repo
      .markAllRead(user.id)
      .then((count) => ({ markedRead: count }));
  }

  async dismiss(id: string, user: SessionUser) {
    const updated = await this.repo.dismiss(id, user.id);
    if (!updated) throw new NotFoundException("Notification not found");
    return updated;
  }

  // ─── Preferences ──────────────────────────────────────────────────────

  async listPreferences(
    user: SessionUser,
  ): Promise<NotificationPreferenceResolved[]> {
    const rows = await this.repo.listPreferences(user.id);
    const byKind = new Map(rows.map((r) => [r.kind, r]));

    return NOTIFICATION_KINDS.map((kind) => {
      const existing = byKind.get(kind);
      const defaults = DEFAULT_PREFERENCES[kind as NotificationKind];
      if (!existing) {
        return {
          kind: kind as NotificationKind,
          inAppEnabled: defaults.inAppEnabled,
          pushEnabled: defaults.pushEnabled,
          quietHoursStart: null,
          quietHoursEnd: null,
          isDefault: true,
        };
      }
      return {
        kind: existing.kind as NotificationKind,
        inAppEnabled: existing.inAppEnabled,
        pushEnabled: existing.pushEnabled,
        quietHoursStart: existing.quietHoursStart,
        quietHoursEnd: existing.quietHoursEnd,
        isDefault: false,
      };
    });
  }

  upsertPreference(data: UpsertNotificationPreferenceDto, user: SessionUser) {
    return this.repo.upsertPreference({
      userId: user.id,
      kind: data.kind,
      inAppEnabled: data.inAppEnabled,
      pushEnabled: data.pushEnabled,
      quietHoursStart: data.quietHoursStart,
      quietHoursEnd: data.quietHoursEnd,
    });
  }

  // ─── Push subscriptions ───────────────────────────────────────────────

  getVapidPublicKey() {
    return { publicKey: this.push.getPublicKey() ?? "" };
  }

  subscribePush(data: CreatePushSubscriptionDto, user: SessionUser) {
    return this.repo.upsertSubscription({
      userId: user.id,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userAgent: data.userAgent ?? null,
      deviceLabel: data.deviceLabel ?? null,
    });
  }

  async unsubscribePush(id: string, user: SessionUser) {
    const row = await this.repo.revokeSubscription(id, user.id);
    if (!row) throw new NotFoundException("Subscription not found");
    return row;
  }

  // ─── Creation — called by listeners and crons ─────────────────────────

  /**
   * Persist a notification and dispatch push delivery according to the
   * recipient's preferences. Returns the inserted row, or `null` if the
   * notification was deduped against a recent identical groupKey.
   */
  async create(input: CreateNotification) {
    const kind = input.kind;
    const defaults = DEFAULT_PREFERENCES[kind];
    const priority = input.priority ?? NOTIFICATION_DEFAULT_PRIORITY[kind];

    // Dedup: if groupKey was passed, skip insert when an unexpired identical
    // notification already exists. Window matches the kind's expiry so we
    // don't double-fire within the same "logical" period.
    if (input.groupKey) {
      const windowHours = Math.max(
        1,
        Math.round(DEFAULT_EXPIRY_MINUTES[kind] / 60),
      );
      const existing = await this.repo.findRecentByGroupKey(
        input.recipientUserId,
        input.groupKey,
        windowHours,
      );
      if (existing) return null;
    }

    const expiresAt =
      input.expiresAt ??
      new Date(Date.now() + DEFAULT_EXPIRY_MINUTES[kind] * 60 * 1000);

    const row = await this.repo.insert({
      recipientUserId: input.recipientUserId,
      kind,
      priority,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      customerId: input.customerId,
      productId: input.productId,
      appointmentId: input.appointmentId,
      orderId: input.orderId,
      suggestedActionId: input.suggestedActionId,
      approvalRequestId: input.approvalRequestId,
      baRatingId: input.baRatingId,
      visitId: input.visitId,
      groupKey: input.groupKey,
      expiresAt,
    });

    // Resolve preferences for this recipient+kind. Missing row → use defaults.
    const prefRows = await this.repo.listPreferences(input.recipientUserId);
    const pref = prefRows.find((p) => p.kind === kind);
    const inAppEnabled = pref?.inAppEnabled ?? defaults.inAppEnabled;
    const pushEnabled = pref?.pushEnabled ?? defaults.pushEnabled;

    // In-app is implicit (the row exists, the inbox will pick it up). Only
    // push needs an external dispatch step.
    const channelsAttempted: string[] = [];
    if (inAppEnabled) channelsAttempted.push("in_app");

    let pushAttempts = 0;
    if (pushEnabled && this.push.isEnabled()) {
      const subs = await this.repo.listSubscriptions(input.recipientUserId);
      pushAttempts = subs.length;
      if (subs.length > 0) channelsAttempted.push("push");

      const dead: string[] = [];
      const used: string[] = [];
      for (const sub of subs) {
        const result = await this.push.send(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            id: row.id,
            kind,
            priority,
            title: input.title,
            body: input.body,
            url: input.actionUrl ?? "/notifications",
          },
        );
        if (result === "gone") dead.push(sub.endpoint);
        if (result === "ok") used.push(sub.id);
      }
      if (dead.length > 0) await this.repo.revokeByEndpoints(dead);
      if (used.length > 0) await this.repo.touchSubscriptions(used);
    }

    await this.repo.setDelivered(
      row.id,
      channelsAttempted.join(",") || "none",
      pushAttempts,
    );

    return row;
  }
}

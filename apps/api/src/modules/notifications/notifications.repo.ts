import { Injectable, Inject } from "@nestjs/common";
import { and, desc, eq, isNull, isNotNull, sql, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  notifications,
  notificationPreferences,
  pushSubscriptions,
  customers,
} from "@loreal/database";
import type { NotificationKind } from "@loreal/contracts";
import type { NotificationListStatus } from "../../dtos/notifications.dto";

/**
 * Thin DB layer for the notifications domain. Kept separate from the service
 * so the service can stay focused on policy (defaults, dedup, fan-out) and
 * remain easy to unit-test without mocking drizzle directly.
 */
@Injectable()
export class NotificationsRepo {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  // ─── notifications ────────────────────────────────────────────────────

  async list(opts: {
    recipientUserId: string;
    status: NotificationListStatus;
    kind?: NotificationKind;
    limit: number;
  }) {
    const conds = [eq(notifications.recipientUserId, opts.recipientUserId)];

    if (opts.status === "unread") {
      conds.push(isNull(notifications.readAt));
      conds.push(isNull(notifications.dismissedAt));
    } else if (opts.status === "read") {
      conds.push(isNotNull(notifications.readAt));
      conds.push(isNull(notifications.dismissedAt));
    } else if (opts.status === "dismissed") {
      conds.push(isNotNull(notifications.dismissedAt));
    }
    if (opts.kind) conds.push(eq(notifications.kind, opts.kind));

    return this.db
      .select({
        id: notifications.id,
        recipientUserId: notifications.recipientUserId,
        kind: notifications.kind,
        priority: notifications.priority,
        title: notifications.title,
        body: notifications.body,
        actionUrl: notifications.actionUrl,
        customerId: notifications.customerId,
        productId: notifications.productId,
        appointmentId: notifications.appointmentId,
        orderId: notifications.orderId,
        suggestedActionId: notifications.suggestedActionId,
        approvalRequestId: notifications.approvalRequestId,
        baRatingId: notifications.baRatingId,
        visitId: notifications.visitId,
        groupKey: notifications.groupKey,
        deliveredChannels: notifications.deliveredChannels,
        pushAttempts: notifications.pushAttempts,
        readAt: notifications.readAt,
        dismissedAt: notifications.dismissedAt,
        snoozedUntil: notifications.snoozedUntil,
        expiresAt: notifications.expiresAt,
        createdAt: notifications.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerAvatarUrl: customers.avatarUrl,
      })
      .from(notifications)
      .leftJoin(customers, eq(customers.id, notifications.customerId))
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt))
      .limit(opts.limit);
  }

  async unreadCount(recipientUserId: string) {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        urgent: sql<number>`count(*) filter (where ${notifications.priority} = 'urgent')::int`,
        high: sql<number>`count(*) filter (where ${notifications.priority} = 'high')::int`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, recipientUserId),
          isNull(notifications.readAt),
          isNull(notifications.dismissedAt),
        ),
      );
    return {
      total: Number(row?.total ?? 0),
      urgent: Number(row?.urgent ?? 0),
      high: Number(row?.high ?? 0),
    };
  }

  async findById(id: string, recipientUserId: string) {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      );
    return row ?? null;
  }

  async findRecentByGroupKey(
    recipientUserId: string,
    groupKey: string,
    sinceHours: number,
  ) {
    const [row] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, recipientUserId),
          eq(notifications.groupKey, groupKey),
          sql`${notifications.createdAt} > now() - (${sinceHours} || ' hours')::interval`,
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async insert(values: typeof notifications.$inferInsert) {
    const [row] = await this.db.insert(notifications).values(values).returning();
    return row;
  }

  async markRead(id: string, recipientUserId: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async markAllRead(recipientUserId: string) {
    const result = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientUserId, recipientUserId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });
    return result.length;
  }

  async dismiss(id: string, recipientUserId: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ dismissedAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async setDelivered(
    id: string,
    channels: string,
    pushAttempts: number,
  ) {
    await this.db
      .update(notifications)
      .set({ deliveredChannels: channels, pushAttempts })
      .where(eq(notifications.id, id));
  }

  // ─── preferences ──────────────────────────────────────────────────────

  async listPreferences(userId: string) {
    return this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  async upsertPreference(values: {
    userId: string;
    kind: NotificationKind;
    inAppEnabled?: boolean;
    pushEnabled?: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  }) {
    const [row] = await this.db
      .insert(notificationPreferences)
      .values({
        userId: values.userId,
        kind: values.kind,
        inAppEnabled: values.inAppEnabled ?? true,
        pushEnabled: values.pushEnabled ?? true,
        quietHoursStart: values.quietHoursStart ?? null,
        quietHoursEnd: values.quietHoursEnd ?? null,
      })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.kind,
        ],
        set: {
          inAppEnabled: values.inAppEnabled ?? sql`${notificationPreferences.inAppEnabled}`,
          pushEnabled: values.pushEnabled ?? sql`${notificationPreferences.pushEnabled}`,
          quietHoursStart:
            values.quietHoursStart === undefined
              ? sql`${notificationPreferences.quietHoursStart}`
              : values.quietHoursStart,
          quietHoursEnd:
            values.quietHoursEnd === undefined
              ? sql`${notificationPreferences.quietHoursEnd}`
              : values.quietHoursEnd,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  // ─── push subscriptions ───────────────────────────────────────────────

  async listSubscriptions(userId: string) {
    return this.db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          isNull(pushSubscriptions.revokedAt),
        ),
      );
  }

  async upsertSubscription(values: typeof pushSubscriptions.$inferInsert) {
    const [row] = await this.db
      .insert(pushSubscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: values.p256dh,
          auth: values.auth,
          userId: values.userId,
          userAgent: values.userAgent ?? null,
          deviceLabel: values.deviceLabel ?? null,
          revokedAt: null,
        },
      })
      .returning();
    return row;
  }

  async revokeSubscription(id: string, userId: string) {
    const [row] = await this.db
      .update(pushSubscriptions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)),
      )
      .returning();
    return row ?? null;
  }

  async revokeByEndpoints(endpoints: string[]) {
    if (endpoints.length === 0) return;
    await this.db
      .update(pushSubscriptions)
      .set({ revokedAt: new Date() })
      .where(inArray(pushSubscriptions.endpoint, endpoints));
  }

  async touchSubscriptions(ids: string[]) {
    if (ids.length === 0) return;
    await this.db
      .update(pushSubscriptions)
      .set({ lastUsedAt: new Date() })
      .where(inArray(pushSubscriptions.id, ids));
  }
}

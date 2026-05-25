import { Injectable, Inject } from "@nestjs/common";
import { and, eq, gte, lte, sql, desc, isNull, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  appointments,
  customers,
  messages,
  serviceTypes,
} from "@loreal/database";
import { ScopeService } from "../../common/services/scope.service";
import type { SessionUser } from "../../common/types/session";
import type {
  TodayAppointment,
  TodayCustomerRef,
  TodayBirthday,
  TodayAtRiskCustomer,
  TodayNewCustomer,
  TodayPendingFollowup,
  AdvisorToday,
} from "@loreal/contracts";

const BIRTHDAY_WINDOW_DAYS = 7;
const AT_RISK_LIMIT = 10;
const NEW_CUSTOMERS_LIMIT = 10;
const PENDING_FOLLOWUPS_LIMIT = 20;

// Re-export so the controller (and any future consumer in this app) can keep
// importing from the service file. The single source of truth lives in
// @loreal/contracts; we just surface the names locally.
export type {
  TodayAppointment,
  TodayCustomerRef,
  TodayBirthday,
  TodayAtRiskCustomer,
  TodayNewCustomer,
  TodayPendingFollowup,
};

export type TodayPayload = AdvisorToday;

@Injectable()
export class AdvisorService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getToday(user: SessionUser): Promise<TodayPayload> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Five buckets fetched concurrently so the slowest one bounds latency
    // rather than the sum. None of them write or depend on each other.
    const [
      appointmentsToday,
      upcomingBirthdays,
      atRiskCustomers,
      newCustomersThisWeek,
      pendingFollowups,
    ] = await Promise.all([
      this.getAppointmentsToday(user, startOfDay, endOfDay),
      this.getUpcomingBirthdays(user),
      this.getAtRiskCustomers(user),
      this.getNewCustomersThisWeek(user, sevenDaysAgo),
      this.getPendingFollowups(user),
    ]);

    return {
      appointmentsToday,
      upcomingBirthdays,
      atRiskCustomers,
      newCustomersThisWeek,
      pendingFollowups,
    };
  }

  // ── Buckets ─────────────────────────────────────────────────────

  private async getAppointmentsToday(
    user: SessionUser,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<TodayAppointment[]> {
    const conditions: any[] = [
      gte(appointments.startTime, startOfDay),
      lte(appointments.startTime, endOfDay),
    ];
    if (user.role === "ba") {
      conditions.push(eq(appointments.staffUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(
        user,
        appointments.storeId,
      );
      if (scope) conditions.push(scope);
    }

    const rows = await this.db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        isVirtual: appointments.isVirtual,
        serviceTypeId: appointments.serviceTypeId,
        serviceTypeName: serviceTypes.displayName,
        serviceTypeColor: serviceTypes.color,
        customerId: appointments.customerId,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerPhone: customers.phone,
        customerLifecycleStage: customers.lifecycleStage,
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(
        serviceTypes,
        eq(appointments.serviceTypeId, serviceTypes.id),
      )
      .where(and(...conditions))
      .orderBy(appointments.startTime);

    return rows.map((r) => ({
      id: r.id,
      startTime: r.startTime.toISOString(),
      durationMinutes: r.durationMinutes,
      status: r.status,
      isVirtual: r.isVirtual,
      serviceTypeId: r.serviceTypeId,
      serviceTypeName: r.serviceTypeName,
      serviceTypeColor: r.serviceTypeColor,
      customerId: r.customerId,
      customerName: `${r.customerFirstName ?? ""} ${r.customerLastName ?? ""}`.trim(),
      customerPhone: r.customerPhone,
      customerLifecycleStage: r.customerLifecycleStage,
    }));
  }

  private async getUpcomingBirthdays(
    user: SessionUser,
  ): Promise<TodayBirthday[]> {
    const conditions: any[] = [
      eq(customers.isActive, true),
      // Restrict to customers the BA owns; managers see their whole store.
      ...(user.role === "ba"
        ? [eq(customers.assignedToUserId, user.id)]
        : []),
    ];
    if (user.role !== "ba") {
      const scope = await this.scopeService.scopeByStore(
        user,
        customers.signupStoreId,
      );
      if (scope) conditions.push(scope);
    }

    // Birthday-in-next-N-days: see customers.service for the wrap-around
    // notes. Duplicated here so we can attach a `daysUntil` computed col.
    const upcomingExpr = sql<number>`
      LEAST(
        (
          make_date(
            extract(year from current_date)::int,
            extract(month from ${customers.birthday})::int,
            extract(day from ${customers.birthday})::int
          ) - current_date
        ),
        (
          make_date(
            extract(year from current_date)::int + 1,
            extract(month from ${customers.birthday})::int,
            extract(day from ${customers.birthday})::int
          ) - current_date
        )
      )
    `;

    const rows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        email: customers.email,
        lifecycleStage: customers.lifecycleStage,
        birthday: customers.birthday,
        daysUntil: upcomingExpr,
      })
      .from(customers)
      .where(
        and(
          ...conditions,
          sql`${customers.birthday} IS NOT NULL`,
          sql`${upcomingExpr} BETWEEN 0 AND ${BIRTHDAY_WINDOW_DAYS}`,
        ),
      )
      .orderBy(upcomingExpr);

    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      lifecycleStage: r.lifecycleStage,
      birthday: r.birthday as unknown as string,
      daysUntil: Number(r.daysUntil),
    }));
  }

  private async getAtRiskCustomers(
    user: SessionUser,
  ): Promise<TodayAtRiskCustomer[]> {
    const conditions: any[] = [
      eq(customers.isActive, true),
      eq(customers.lifecycleStage, "at_risk"),
      ...(user.role === "ba" ? [eq(customers.assignedToUserId, user.id)] : []),
    ];
    if (user.role !== "ba") {
      const scope = await this.scopeService.scopeByStore(
        user,
        customers.signupStoreId,
      );
      if (scope) conditions.push(scope);
    }

    const rows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        email: customers.email,
        lifecycleStage: customers.lifecycleStage,
        lastOrderAt: customers.lastOrderAt,
      })
      .from(customers)
      .where(and(...conditions))
      // Oldest "last order" first — those need attention most.
      .orderBy(customers.lastOrderAt)
      .limit(AT_RISK_LIMIT);

    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      lifecycleStage: r.lifecycleStage,
      lastOrderAt: r.lastOrderAt
        ? r.lastOrderAt.toISOString()
        : null,
      daysSinceLastOrder: r.lastOrderAt
        ? Math.floor(
            (now - new Date(r.lastOrderAt).getTime()) / 86_400_000,
          )
        : null,
    }));
  }

  private async getNewCustomersThisWeek(
    user: SessionUser,
    sevenDaysAgo: Date,
  ): Promise<TodayNewCustomer[]> {
    const conditions: any[] = [
      eq(customers.isActive, true),
      gte(customers.enrolledAt, sevenDaysAgo),
      ...(user.role === "ba"
        ? [eq(customers.assignedToUserId, user.id)]
        : []),
    ];
    if (user.role !== "ba") {
      const scope = await this.scopeService.scopeByStore(
        user,
        customers.signupStoreId,
      );
      if (scope) conditions.push(scope);
    }

    const rows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        email: customers.email,
        lifecycleStage: customers.lifecycleStage,
        enrolledAt: customers.enrolledAt,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.enrolledAt))
      .limit(NEW_CUSTOMERS_LIMIT);

    return rows.map((r) => ({
      ...r,
      enrolledAt: r.enrolledAt.toISOString(),
    }));
  }

  private async getPendingFollowups(
    user: SessionUser,
  ): Promise<TodayPendingFollowup[]> {
    // The scheduler writes lifecycle alerts as `messages` rows. Until
    // a BA actually contacts the customer (which creates a delivered message)
    // we treat them as pending tasks. We filter rows that have no delivery
    // tracking yet and that target customers the BA owns.
    const baCustomerIds = await this.getBaCustomerIds(user);
    if (baCustomerIds.length === 0) return [];

    const rows = await this.db
      .select({
        id: messages.id,
        customerId: messages.customerId,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        campaignType: messages.campaignType,
        body: messages.body,
        channel: messages.channel,
        sentAt: messages.sentAt,
      })
      .from(messages)
      .leftJoin(customers, eq(messages.customerId, customers.id))
      .where(
        and(
          inArray(messages.customerId, baCustomerIds),
          isNull(messages.deliveredAt),
          isNull(messages.readAt),
          isNull(messages.respondedAt),
        ),
      )
      .orderBy(desc(messages.sentAt))
      .limit(PENDING_FOLLOWUPS_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: `${r.customerFirstName ?? ""} ${r.customerLastName ?? ""}`.trim(),
      campaignType: r.campaignType,
      body: r.body,
      channel: r.channel,
      sentAt: r.sentAt.toISOString(),
    }));
  }

  /**
   * IDs of customers in the BA's care. For BA we use `assignedToUserId`; for
   * managers/admins we widen to all customers in their store scope. Used by
   * the followups bucket to keep it BA-relevant.
   */
  private async getBaCustomerIds(user: SessionUser): Promise<string[]> {
    const conditions: any[] = [eq(customers.isActive, true)];
    if (user.role === "ba") {
      conditions.push(eq(customers.assignedToUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(
        user,
        customers.signupStoreId,
      );
      if (scope) conditions.push(scope);
    }
    const rows = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(...conditions));
    return rows.map((r) => r.id);
  }
}

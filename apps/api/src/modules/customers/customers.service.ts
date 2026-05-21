import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, or, ilike, sql, gte, lte, asc, desc, count, sum } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  beautyProfiles,
  beautyProfileShades,
  consents,
  purchases,
  purchaseItems,
  products,
  recommendations,
  samples,
  appointments,
  appointmentEventTypes,
  communications,
  users,
  stores,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { PrivacyNoticesService } from "../privacy-notices/privacy-notices.service";
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFiltersDto,
  RegisterCustomerDto,
  CheckDuplicateDto,
} from "../../dtos/customers.dto";
import { rankCustomerSearchResults } from "@loreal/domain";

const MARKETING_CHANNEL_TO_CONSENT = {
  email: "marketing_email",
  sms: "marketing_sms",
  whatsapp: "marketing_whatsapp",
} as const;

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(PrivacyNoticesService) private privacyNoticesService: PrivacyNoticesService,
  ) {}

  async findAll(
    user: SessionUser,
    filters: CustomerFiltersDto,
  ) {
    const scope = await this.scopeService.scopeByStore(
      user,
      customers.registeredAtStoreId,
    );

    const conditions: any[] = [
      eq(customers.inactive, false),
      ...(scope ? [scope] : []),
      ...(filters?.segment
        ? [eq(customers.lifecycleSegment, filters.segment)]
        : []),
      ...(filters?.storeId
        ? [eq(customers.registeredAtStoreId, filters.storeId)]
        : []),
      ...(filters?.baUserId
        ? [eq(customers.lastBaUserId, filters.baUserId)]
        : []),
      ...(filters?.dateFrom
        ? [gte(customers.customerSince, filters.dateFrom)]
        : []),
      ...(filters?.dateTo
        ? [lte(customers.customerSince, filters.dateTo)]
        : []),
      ...(filters?.birthdayWithinDays
        ? [birthdayWithinDaysCondition(filters.birthdayWithinDays)]
        : []),
    ];

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Total count
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(where);

    // Data with LTV and BA name
    const ltvSubquery = this.db
      .select({
        customerId: purchases.customerId,
        ltv: sum(purchases.totalAmount).as("ltv"),
        purchaseCount: count().as("purchase_count"),
      })
      .from(purchases)
      .groupBy(purchases.customerId)
      .as("ltv_sq");

    // Determine sort
    let orderByClause;
    const sortDir = filters?.sortOrder === "asc" ? asc : desc;
    switch (filters?.sortBy) {
      case "customerSince": orderByClause = sortDir(customers.customerSince); break;
      case "lastContactAt": orderByClause = sortDir(customers.lastContactAt); break;
      case "lastTransactionAt": orderByClause = sortDir(customers.lastTransactionAt); break;
      case "ltv": orderByClause = sortDir(ltvSubquery.ltv); break;
      default: orderByClause = asc(customers.firstName); break;
    }

    const rows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        gender: customers.gender,
        birthDate: customers.birthDate,
        lifecycleSegment: customers.lifecycleSegment,
        customerSince: customers.customerSince,
        lastContactAt: customers.lastContactAt,
        lastTransactionAt: customers.lastTransactionAt,
        registeredAtStoreId: customers.registeredAtStoreId,
        lastBaUserId: customers.lastBaUserId,
        baName: users.fullName,
        ltv: ltvSubquery.ltv,
        purchaseCount: ltvSubquery.purchaseCount,
      })
      .from(customers)
      .leftJoin(users, eq(customers.lastBaUserId, users.id))
      .leftJoin(ltvSubquery, eq(customers.id, ltvSubquery.customerId))
      .where(where)
      .orderBy(orderByClause)
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    return {
      data: rows,
      total: totalResult?.count ?? 0,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async findOne(id: string, user: SessionUser) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    if (!customer) throw new NotFoundException("Customer not found");

    await this.auditService.log(
      user,
      "customer_viewed",
      "customer",
      customer.id,
    );

    return customer;
  }

  /**
   * Aggregated metrics for the profile header (LTV, deltas, counts, next/last
   * visit). One SQL roundtrip rather than 4 — the profile header is the most
   * frequent read in the app, and the BA has 90 seconds.
   *
   * `ltvChangePct` compares the last 30 days of purchases against the prior 30.
   * Null when the prior window has no purchases (avoids divide-by-zero and
   * spurious "+∞%" deltas for brand-new clients).
   */
  async getMetrics(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [purchaseAgg] = await this.db
      .select({
        ltv: sql<string | null>`coalesce(sum(${purchases.totalAmount}), 0)`,
        purchaseCount: count(),
        ltvLast30: sql<string | null>`coalesce(sum(${purchases.totalAmount}) filter (where ${purchases.purchasedAt} >= ${thirtyDaysAgo}), 0)`,
        ltvPrior30: sql<string | null>`coalesce(sum(${purchases.totalAmount}) filter (where ${purchases.purchasedAt} >= ${sixtyDaysAgo} and ${purchases.purchasedAt} < ${thirtyDaysAgo}), 0)`,
        lastPurchaseAt: sql<Date | null>`max(${purchases.purchasedAt})`,
      })
      .from(purchases)
      .where(eq(purchases.customerId, customerId));

    const [appointmentAgg] = await this.db
      .select({
        appointmentCount: count(),
        nextAppointmentAt: sql<Date | null>`min(${appointments.scheduledAt}) filter (where ${appointments.scheduledAt} >= now() and ${appointments.status} in ('scheduled', 'confirmed'))`,
        lastAppointmentAt: sql<Date | null>`max(${appointments.scheduledAt}) filter (where ${appointments.scheduledAt} < now() and ${appointments.status} in ('completed', 'confirmed'))`,
      })
      .from(appointments)
      .where(eq(appointments.customerId, customerId));

    const ltv = Number(purchaseAgg?.ltv ?? 0);
    const ltvLast30 = Number(purchaseAgg?.ltvLast30 ?? 0);
    const ltvPrior30 = Number(purchaseAgg?.ltvPrior30 ?? 0);

    let ltvChangePct: number | null = null;
    if (ltvPrior30 > 0) {
      ltvChangePct = Math.round(((ltvLast30 - ltvPrior30) / ltvPrior30) * 100);
    }

    const lastVisitCandidates = [
      purchaseAgg?.lastPurchaseAt ? new Date(purchaseAgg.lastPurchaseAt) : null,
      appointmentAgg?.lastAppointmentAt
        ? new Date(appointmentAgg.lastAppointmentAt)
        : null,
    ].filter((d): d is Date => d !== null);

    const lastVisitAt =
      lastVisitCandidates.length > 0
        ? new Date(Math.max(...lastVisitCandidates.map((d) => d.getTime())))
        : null;

    return {
      ltv,
      ltvChangePct,
      purchaseCount: purchaseAgg?.purchaseCount ?? 0,
      appointmentCount: appointmentAgg?.appointmentCount ?? 0,
      nextAppointmentAt: appointmentAgg?.nextAppointmentAt
        ? new Date(appointmentAgg.nextAppointmentAt).toISOString()
        : null,
      lastVisitAt: lastVisitAt ? lastVisitAt.toISOString() : null,
    };
  }

  /**
   * Unified, cursor-paginated activity timeline. Merges five event streams
   * (synthetic registration + purchases + recommendations + appointments +
   * communications) into a single chronological feed.
   *
   * We over-fetch by `limit + 1` from each source so that after the global
   * merge we always have enough rows to fill the requested page and detect
   * whether more exist. This avoids needing UNION ALL / window functions and
   * keeps each subquery indexable.
   */
  async getActivity(
    customerId: string,
    user: SessionUser,
    opts: { limit: number; before?: Date },
  ) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const [customer] = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        customerSince: customers.customerSince,
        registeredByUserId: customers.registeredByUserId,
      })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) throw new NotFoundException("Customer not found");

    const fetchSize = opts.limit + 1;
    const beforeCondition = opts.before
      ? (col: any) => lte(col, opts.before!)
      : null;

    // Purchases — include first 3 product names as a preview line
    const purchaseRows = await this.db
      .select({
        id: purchases.id,
        purchasedAt: purchases.purchasedAt,
        totalAmount: purchases.totalAmount,
        attributedBaUserId: purchases.attributedBaUserId,
        baName: users.fullName,
        productNames: sql<string[]>`coalesce(
          array_agg(${products.name} order by ${purchaseItems.unitPrice} desc)
            filter (where ${products.name} is not null),
          '{}'
        )`,
      })
      .from(purchases)
      .leftJoin(users, eq(purchases.attributedBaUserId, users.id))
      .leftJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
      .leftJoin(products, eq(products.id, purchaseItems.productId))
      .where(
        and(
          eq(purchases.customerId, customerId),
          ...(beforeCondition ? [beforeCondition(purchases.purchasedAt)] : []),
        ),
      )
      .groupBy(purchases.id, users.fullName)
      .orderBy(desc(purchases.purchasedAt))
      .limit(fetchSize);

    // Recommendations — single product per row in this schema
    const recommendationRows = await this.db
      .select({
        id: recommendations.id,
        recommendedAt: recommendations.recommendedAt,
        baUserId: recommendations.baUserId,
        baName: users.fullName,
        productName: products.name,
        notes: recommendations.notes,
      })
      .from(recommendations)
      .leftJoin(users, eq(recommendations.baUserId, users.id))
      .leftJoin(products, eq(products.id, recommendations.productId))
      .where(
        and(
          eq(recommendations.customerId, customerId),
          ...(beforeCondition
            ? [beforeCondition(recommendations.recommendedAt)]
            : []),
        ),
      )
      .orderBy(desc(recommendations.recommendedAt))
      .limit(fetchSize);

    // Appointments
    const appointmentRows = await this.db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        baUserId: appointments.baUserId,
        baName: users.fullName,
        eventTypeName: appointmentEventTypes.displayName,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.baUserId, users.id))
      .leftJoin(
        appointmentEventTypes,
        eq(appointmentEventTypes.id, appointments.eventTypeId),
      )
      .where(
        and(
          eq(appointments.customerId, customerId),
          ...(beforeCondition
            ? [beforeCondition(appointments.scheduledAt)]
            : []),
        ),
      )
      .orderBy(desc(appointments.scheduledAt))
      .limit(fetchSize);

    // Communications
    const communicationRows = await this.db
      .select({
        id: communications.id,
        sentAt: communications.sentAt,
        channel: communications.channel,
        subject: communications.subject,
        body: communications.body,
        followupType: communications.followupType,
        sentByUserId: communications.sentByUserId,
        baName: users.fullName,
      })
      .from(communications)
      .leftJoin(users, eq(communications.sentByUserId, users.id))
      .where(
        and(
          eq(communications.customerId, customerId),
          ...(beforeCondition ? [beforeCondition(communications.sentAt)] : []),
        ),
      )
      .orderBy(desc(communications.sentAt))
      .limit(fetchSize);

    type RawEvent = {
      id: string;
      type:
        | "customer_registered"
        | "purchase"
        | "recommendation"
        | "appointment"
        | "communication";
      occurredAt: Date;
      actor: { id: string | null; name: string | null };
      title: string;
      body: string | null;
      amount: number | null;
      metadata: Record<string, unknown> | null;
    };

    const events: RawEvent[] = [];

    for (const row of purchaseRows) {
      const total = Number(row.totalAmount);
      const productNames = row.productNames ?? [];
      const preview = productNames.slice(0, 3).join(" · ");
      events.push({
        id: `purchase:${row.id}`,
        type: "purchase",
        occurredAt: new Date(row.purchasedAt),
        actor: { id: row.attributedBaUserId, name: row.baName },
        title: `Compra de $${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        body: preview || null,
        amount: total,
        metadata: { itemCount: productNames.length },
      });
    }

    for (const row of recommendationRows) {
      events.push({
        id: `recommendation:${row.id}`,
        type: "recommendation",
        occurredAt: new Date(row.recommendedAt),
        actor: { id: row.baUserId, name: row.baName },
        title: row.productName
          ? `Recomendación: ${row.productName}`
          : "Recomendación",
        body: row.notes,
        amount: null,
        metadata: null,
      });
    }

    for (const row of appointmentRows) {
      const isPast = new Date(row.scheduledAt).getTime() < Date.now();
      events.push({
        id: `appointment:${row.id}`,
        type: "appointment",
        occurredAt: new Date(row.scheduledAt),
        actor: { id: row.baUserId, name: row.baName },
        title: row.eventTypeName
          ? `${row.eventTypeName} (${row.durationMinutes} min)`
          : `Cita (${row.durationMinutes} min)`,
        body: null,
        amount: null,
        metadata: { status: row.status, isPast },
      });
    }

    for (const row of communicationRows) {
      events.push({
        id: `communication:${row.id}`,
        type: "communication",
        occurredAt: new Date(row.sentAt),
        actor: { id: row.sentByUserId, name: row.baName },
        title: `Mensaje por ${row.channel}`,
        body: row.subject ?? row.body.slice(0, 140),
        amount: null,
        metadata: { channel: row.channel, followupType: row.followupType },
      });
    }

    // Synthetic registration event — only emit on the oldest page so it shows
    // up at the bottom of the timeline (as designed in the spec mockup).
    const customerSince = new Date(customer.customerSince);
    if (!opts.before || customerSince <= opts.before) {
      const [registeredBy] = customer.registeredByUserId
        ? await this.db
            .select({ id: users.id, fullName: users.fullName })
            .from(users)
            .where(eq(users.id, customer.registeredByUserId))
        : [];

      events.push({
        id: `registration:${customer.id}`,
        type: "customer_registered",
        occurredAt: customerSince,
        actor: {
          id: registeredBy?.id ?? null,
          name: registeredBy?.fullName ?? null,
        },
        title: "Clienta registrada",
        body: null,
        amount: null,
        metadata: null,
      });
    }

    // Global sort + page slice. Cursor is the occurredAt of the last returned
    // event; the next call passes it as `before` (inclusive of equal-instant
    // ties is fine because event IDs disambiguate).
    events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const page = events.slice(0, opts.limit);
    const hasMore = events.length > opts.limit;
    const nextCursor =
      hasMore && page.length > 0
        ? page[page.length - 1].occurredAt.toISOString()
        : null;

    return {
      events: page.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() })),
      nextCursor,
    };
  }

  async create(data: CreateCustomerDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    const [customer] = await this.db
      .insert(customers)
      .values({
        ...data,
        birthDate: data.birthDate
          ? data.birthDate.toISOString().split("T")[0]
          : undefined,
        registeredAtStoreId: storeId,
        registeredByUserId: user.id,
        lastBaUserId: user.id,
      })
      .returning();

    return customer;
  }

  /**
   * Atomic customer + consents registration. Used by the in-store wizard.
   * Either every record (customer + privacy notice consent + N marketing
   * channel consents) lands in the DB, or none does. This is the only path
   * that satisfies LFPDPPP — never let a customer exist without a
   * privacy_notice consent row.
   */
  async register(
    data: RegisterCustomerDto,
    user: SessionUser,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const storeId = this.scopeService.assertStore(user);

    // Validate the privacy notice version BEFORE opening the transaction.
    // Prevents clients from submitting stale versions.
    await this.privacyNoticesService.assertVersionIsActive(
      data.consents.privacyNoticeVersion,
    );

    const customer = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(customers)
        .values({
          ...data.customer,
          birthDate: data.customer.birthDate
            ? data.customer.birthDate.toISOString().split("T")[0]
            : undefined,
          registeredAtStoreId: storeId,
          registeredByUserId: user.id,
          lastBaUserId: user.id,
        })
        .returning();

      // 1. Privacy notice consent (mandatory, carries signature).
      await tx.insert(consents).values({
        customerId: created.id,
        type: "privacy_notice",
        version: data.consents.privacyNoticeVersion,
        source: "wizard_in_store",
        signatureUrl: data.consents.signatureUrl,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      // 2. Marketing channel consents (one row per channel marked true).
      const channelRows = (
        Object.entries(data.consents.marketingChannels) as [
          keyof typeof MARKETING_CHANNEL_TO_CONSENT,
          boolean | undefined,
        ][]
      )
        .filter(([, granted]) => granted === true)
        .map(([channel]) => ({
          customerId: created.id,
          type: MARKETING_CHANNEL_TO_CONSENT[channel],
          version: data.consents.privacyNoticeVersion,
          source: "wizard_in_store",
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        }));

      if (channelRows.length > 0) {
        await tx.insert(consents).values(channelRows);
      }

      return created;
    });

    await this.auditService.log(
      user,
      "customer_registered",
      "customer",
      customer.id,
      {
        privacyNoticeVersion: data.consents.privacyNoticeVersion,
        marketingChannels: data.consents.marketingChannels,
      },
      meta,
    );

    return customer;
  }

  /**
   * Cross-store duplicate check for the wizard's "search before create" step.
   * Returns minimal metadata only — never leaks PII from stores the BA can't
   * access. The `inUserScope` flag tells the UI whether the BA can open the
   * existing profile or needs to call support to claim it.
   */
  async checkDuplicate(params: CheckDuplicateDto, user: SessionUser) {
    if (!params.email && !params.phone) {
      return { hasMatch: false, matches: [] };
    }

    const conditions = [
      ...(params.email ? [eq(customers.email, params.email)] : []),
      ...(params.phone ? [eq(customers.phone, params.phone)] : []),
    ];

    const rows = await this.db
      .select({
        customerId: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        storeId: customers.registeredAtStoreId,
        storeName: stores.displayName,
      })
      .from(customers)
      .leftJoin(stores, eq(customers.registeredAtStoreId, stores.id))
      .where(or(...conditions));

    const accessibleStoreIds =
      user.role === "admin"
        ? null
        : await this.scopeService.getAccessibleStoreIds(user);

    const matches = rows.map((r) => ({
      customerId: r.customerId,
      firstName: r.firstName,
      lastName: r.lastName,
      matchedOn:
        params.email && r.email === params.email
          ? ("email" as const)
          : ("phone" as const),
      storeName: r.storeName ?? "—",
      inUserScope:
        accessibleStoreIds === null
          ? true
          : accessibleStoreIds.includes(r.storeId),
    }));

    return { hasMatch: matches.length > 0, matches };
  }

  async update(id: string, data: UpdateCustomerDto, user: SessionUser) {
    const [existing] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    if (!existing) throw new NotFoundException("Customer not found");

    const [updated] = await this.db
      .update(customers)
      .set({
        ...data,
        birthDate: data.birthDate
          ? data.birthDate.toISOString().split("T")[0]
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    // Build changes diff
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data) as (keyof UpdateCustomerDto)[]) {
      if (data[key] !== undefined && data[key] !== (existing as any)[key]) {
        changes[key] = { from: (existing as any)[key], to: data[key] };
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.auditService.log(
        user,
        "customer_updated",
        "customer",
        id,
        changes,
      );
    }

    return updated;
  }

  async search(query: string, type: string, user: SessionUser) {
    const scope = await this.scopeService.scopeByStore(
      user,
      customers.registeredAtStoreId,
    );

    if (type === "exact") {
      const conditions = [
        or(eq(customers.email, query), eq(customers.phone, query)),
        ...(scope ? [scope] : []),
      ];

      return this.db
        .select()
        .from(customers)
        .where(and(...conditions));
    }

    // type === "name" (default)
    const nameCondition = or(
      ilike(customers.firstName, `%${query}%`),
      ilike(customers.lastName, `%${query}%`),
    );

    const conditions = [nameCondition, ...(scope ? [scope] : [])];

    const rows = await this.db
      .select()
      .from(customers)
      .where(and(...conditions));

    const ranked = rankCustomerSearchResults({
      results: rows.map((r) => ({
        customerId: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        lastContactAt: r.lastContactAt,
        lastTransactionAt: r.lastTransactionAt,
        lastBaUserId: r.lastBaUserId,
        lifecycleSegment: r.lifecycleSegment as any,
        textMatchScore: 50, // base score for ilike matches
      })),
      searchingBaUserId: user.id,
    });

    return ranked;
  }

  async executeRightToBeForgotten(
    customerId: string,
    requestFolio: string,
    user: SessionUser,
  ) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) throw new NotFoundException("Customer not found");

    const anonymized = `ARCO-${requestFolio}`;

    await this.db.transaction(async (tx) => {
      // 1. Delete beauty profile shades (via beauty profile)
      const [profile] = await tx
        .select({ id: beautyProfiles.id })
        .from(beautyProfiles)
        .where(eq(beautyProfiles.customerId, customerId));

      if (profile) {
        await tx
          .delete(beautyProfileShades)
          .where(eq(beautyProfileShades.beautyProfileId, profile.id));
        await tx
          .delete(beautyProfiles)
          .where(eq(beautyProfiles.customerId, customerId));
      }

      // 2. Delete consents
      await tx.delete(consents).where(eq(consents.customerId, customerId));

      // 3. Anonymize purchases
      await tx
        .update(purchases)
        .set({ customerId: sql`null` } as any)
        .where(eq(purchases.customerId, customerId));

      // 4. Anonymize recommendations
      await tx
        .update(recommendations)
        .set({ customerId: sql`null` } as any)
        .where(eq(recommendations.customerId, customerId));

      // 5. Anonymize samples
      await tx
        .update(samples)
        .set({ customerId: sql`null` } as any)
        .where(eq(samples.customerId, customerId));

      // 6. Anonymize appointments
      await tx
        .update(appointments)
        .set({ customerId: sql`null` } as any)
        .where(eq(appointments.customerId, customerId));

      // 7. Anonymize communications
      await tx
        .update(communications)
        .set({ customerId: sql`null` } as any)
        .where(eq(communications.customerId, customerId));

      // 8. Hard delete customer
      await tx.delete(customers).where(eq(customers.id, customerId));
    });

    await this.auditService.log(
      user,
      "customer_deleted_arco_request",
      "customer",
      customerId,
      {
        requestFolio,
        customerName: `${customer.firstName} ${customer.lastName}`,
        anonymizedAs: anonymized,
      },
    );

    return { success: true, requestFolio };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Build a SQL predicate that matches customers whose birthday (month + day)
 * falls within the next N days from today, wrapping around the year end.
 *
 * The DB stores `birthDate` as a `date` column. We pull `month` and `day`
 * out and compare via day-of-year math so a December birthday still matches
 * when "today" is late December and the window extends into January.
 */
function birthdayWithinDaysCondition(days: number) {
  return sql`
    ${customers.birthDate} IS NOT NULL AND (
      (
        make_date(
          extract(year from current_date)::int,
          extract(month from ${customers.birthDate})::int,
          extract(day from ${customers.birthDate})::int
        ) BETWEEN current_date AND current_date + (${days} || ' days')::interval
      )
      OR
      (
        -- Wrap-around: if the window crosses Jan 1, also include birthdays
        -- that fall in the early days of next year.
        make_date(
          extract(year from current_date)::int + 1,
          extract(month from ${customers.birthDate})::int,
          extract(day from ${customers.birthDate})::int
        ) BETWEEN current_date AND current_date + (${days} || ' days')::interval
      )
    )
  `;
}

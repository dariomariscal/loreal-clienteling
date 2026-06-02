import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, or, ilike, sql, gte, lte, asc, desc, count, sum } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  beautyProfiles,
  shadeMatches,
  consents,
  orders,
  lineItems,
  products,
  recommendations,
  samples,
  appointments,
  serviceTypes,
  messages,
  notes,
  users,
  stores,
  customerVisits,
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
  ReassignCustomerDto,
} from "../../dtos/customers.dto";
import { UserRole } from "@loreal/contracts";
import { rankCustomerSearchResults } from "@loreal/domain";

const MARKETING_CHANNEL_TO_CONSENT = {
  email: "marketing_email",
  sms: "marketing_sms",
  whatsapp: "marketing_whatsapp",
} as const;

// Spanish labels used when serializing visit events into the timeline. Kept
// here (not in `@loreal/contracts`) because the timeline is the only API
// surface that needs to render strings — every other consumer (web UI,
// future native apps) translates from the raw enum via its own vocabulary.
const VISIT_REASON_LABEL: Record<string, string> = {
  browsing: "Búsqueda",
  replenishment: "Reposición",
  new_purchase: "Nueva compra",
  gift: "Regalo",
  diagnostic: "Diagnóstico",
  fragrance_discovery: "Fragancia",
  makeup_lesson: "Lección de maquillaje",
  bridal_event_prep: "Boda o evento",
  return: "Devolución",
  complaint: "Reclamo",
  loyalty_redemption: "Canjear puntos",
  event_attendance: "Asistencia a evento",
  vip_private: "Atención VIP",
  click_collect_pickup: "Recoger pedido",
};

const VISIT_OUTCOME_LABEL: Record<string, string> = {
  purchased: "compró",
  no_purchase: "sin compra",
  sample_given: "muestra entregada",
  followup_needed: "seguimiento",
  return_processed: "devolución procesada",
};

const VISIT_SENTIMENT_EMOJI: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😞",
};

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
      customers.signupStoreId,
    );

    const conditions: any[] = [
      eq(customers.isActive, true),
      ...(scope ? [scope] : []),
      ...(filters?.stage
        ? [eq(customers.lifecycleStage, filters.stage)]
        : []),
      ...(filters?.storeId
        ? [eq(customers.signupStoreId, filters.storeId)]
        : []),
      ...(filters?.assignedToUserId
        ? [eq(customers.assignedToUserId, filters.assignedToUserId)]
        : []),
      ...(filters?.dateFrom
        ? [gte(customers.enrolledAt, filters.dateFrom)]
        : []),
      ...(filters?.dateTo
        ? [lte(customers.enrolledAt, filters.dateTo)]
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

    // Data with LTV and assigned-advisor name
    const ltvSubquery = this.db
      .select({
        customerId: orders.customerId,
        ltv: sum(orders.totalPrice).as("ltv"),
        orderCount: count().as("order_count"),
      })
      .from(orders)
      .groupBy(orders.customerId)
      .as("ltv_sq");

    // Determine sort
    let orderByClause;
    const sortDir = filters?.sortOrder === "asc" ? asc : desc;
    switch (filters?.sortBy) {
      case "enrolledAt": orderByClause = sortDir(customers.enrolledAt); break;
      case "lastInteractionAt": orderByClause = sortDir(customers.lastInteractionAt); break;
      case "lastOrderAt": orderByClause = sortDir(customers.lastOrderAt); break;
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
        birthday: customers.birthday,
        lifecycleStage: customers.lifecycleStage,
        enrolledAt: customers.enrolledAt,
        lastInteractionAt: customers.lastInteractionAt,
        lastOrderAt: customers.lastOrderAt,
        signupStoreId: customers.signupStoreId,
        assignedToUserId: customers.assignedToUserId,
        assignedToName: users.fullName,
        ltv: ltvSubquery.ltv,
        orderCount: ltvSubquery.orderCount,
      })
      .from(customers)
      .leftJoin(users, eq(customers.assignedToUserId, users.id))
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
   * frequent read in the app, and the advisor has 90 seconds.
   *
   * `ltvChangePct` compares the last 30 days of orders against the prior 30.
   * Null when the prior window has no orders (avoids divide-by-zero and
   * spurious "+∞%" deltas for brand-new customers).
   */
  async getMetrics(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [orderAgg] = await this.db
      .select({
        ltv: sql<string | null>`coalesce(sum(${orders.totalPrice}), 0)`,
        ordersCount: count(),
        ltvLast30: sql<string | null>`coalesce(sum(${orders.totalPrice}) filter (where ${orders.processedAt} >= ${thirtyDaysAgo}), 0)`,
        ltvPrior30: sql<string | null>`coalesce(sum(${orders.totalPrice}) filter (where ${orders.processedAt} >= ${sixtyDaysAgo} and ${orders.processedAt} < ${thirtyDaysAgo}), 0)`,
        lastOrderAt: sql<Date | null>`max(${orders.processedAt})`,
      })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    const [appointmentAgg] = await this.db
      .select({
        appointmentCount: count(),
        nextAppointmentAt: sql<Date | null>`min(${appointments.startTime}) filter (where ${appointments.startTime} >= now() and ${appointments.status} in ('scheduled', 'confirmed'))`,
        lastAppointmentAt: sql<Date | null>`max(${appointments.startTime}) filter (where ${appointments.startTime} < now() and ${appointments.status} in ('completed', 'confirmed'))`,
      })
      .from(appointments)
      .where(eq(appointments.customerId, customerId));

    const ltv = Number(orderAgg?.ltv ?? 0);
    const ltvLast30 = Number(orderAgg?.ltvLast30 ?? 0);
    const ltvPrior30 = Number(orderAgg?.ltvPrior30 ?? 0);

    let ltvChangePct: number | null = null;
    if (ltvPrior30 > 0) {
      ltvChangePct = Math.round(((ltvLast30 - ltvPrior30) / ltvPrior30) * 100);
    }

    const lastVisitCandidates = [
      orderAgg?.lastOrderAt ? new Date(orderAgg.lastOrderAt) : null,
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
      ordersCount: orderAgg?.ordersCount ?? 0,
      appointmentCount: appointmentAgg?.appointmentCount ?? 0,
      nextAppointmentAt: appointmentAgg?.nextAppointmentAt
        ? new Date(appointmentAgg.nextAppointmentAt).toISOString()
        : null,
      lastVisitAt: lastVisitAt ? lastVisitAt.toISOString() : null,
    };
  }

  /**
   * Unified, cursor-paginated activity timeline. Merges the customer's event
   * streams (synthetic registration + orders + recommendations + appointments
   * + visits + messages + notes) into a single chronological feed.
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
        enrolledAt: customers.enrolledAt,
        createdByUserId: customers.createdByUserId,
      })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) throw new NotFoundException("Customer not found");

    const fetchSize = opts.limit + 1;
    const beforeCondition = opts.before
      ? (col: any) => lte(col, opts.before!)
      : null;

    // Orders — include first 3 product titles as a preview line
    const orderRows = await this.db
      .select({
        id: orders.id,
        processedAt: orders.processedAt,
        totalPrice: orders.totalPrice,
        attributedUserId: orders.attributedUserId,
        attributedName: users.fullName,
        productTitles: sql<string[]>`coalesce(
          array_agg(${products.title} order by ${lineItems.price} desc)
            filter (where ${products.title} is not null),
          '{}'
        )`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.attributedUserId, users.id))
      .leftJoin(lineItems, eq(lineItems.orderId, orders.id))
      .leftJoin(products, eq(products.id, lineItems.productId))
      .where(
        and(
          eq(orders.customerId, customerId),
          ...(beforeCondition ? [beforeCondition(orders.processedAt)] : []),
        ),
      )
      .groupBy(orders.id, users.fullName)
      .orderBy(desc(orders.processedAt))
      .limit(fetchSize);

    // Recommendations — single product per row in this schema
    const recommendationRows = await this.db
      .select({
        id: recommendations.id,
        recommendedAt: recommendations.recommendedAt,
        recommendedByUserId: recommendations.recommendedByUserId,
        recommendedByName: users.fullName,
        productTitle: products.title,
        notes: recommendations.notes,
      })
      .from(recommendations)
      .leftJoin(users, eq(recommendations.recommendedByUserId, users.id))
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
        startTime: appointments.startTime,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        staffUserId: appointments.staffUserId,
        staffName: users.fullName,
        serviceTypeName: serviceTypes.displayName,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.staffUserId, users.id))
      .leftJoin(
        serviceTypes,
        eq(serviceTypes.id, appointments.serviceTypeId),
      )
      .where(
        and(
          eq(appointments.customerId, customerId),
          ...(beforeCondition
            ? [beforeCondition(appointments.startTime)]
            : []),
        ),
      )
      .orderBy(desc(appointments.startTime))
      .limit(fetchSize);

    // Messages
    const messageRows = await this.db
      .select({
        id: messages.id,
        sentAt: messages.sentAt,
        channel: messages.channel,
        subject: messages.subject,
        body: messages.body,
        campaignType: messages.campaignType,
        sentByUserId: messages.sentByUserId,
        sentByName: users.fullName,
      })
      .from(messages)
      .leftJoin(users, eq(messages.sentByUserId, users.id))
      .where(
        and(
          eq(messages.customerId, customerId),
          ...(beforeCondition ? [beforeCondition(messages.sentAt)] : []),
        ),
      )
      .orderBy(desc(messages.sentAt))
      .limit(fetchSize);

    // Visits — completed visits surface as timeline events. In-progress
    // visits are excluded: they live in the dedicated "Visita en curso"
    // affordance and would confuse the chronological feed (they have no
    // outcome yet).
    const visitRows = await this.db
      .select({
        id: customerVisits.id,
        startedAt: customerVisits.startedAt,
        endedAt: customerVisits.endedAt,
        durationMinutes: customerVisits.durationMinutes,
        status: customerVisits.status,
        visitReason: customerVisits.visitReason,
        bookedReason: customerVisits.bookedReason,
        outcome: customerVisits.outcome,
        sentiment: customerVisits.sentiment,
        attendedByUserId: customerVisits.attendedByUserId,
        attendedByName: users.fullName,
      })
      .from(customerVisits)
      .leftJoin(users, eq(customerVisits.attendedByUserId, users.id))
      .where(
        and(
          eq(customerVisits.customerId, customerId),
          // Use startedAt as the canonical timeline timestamp — endedAt can be
          // null for abandoned visits, and we still want them on the timeline.
          ...(beforeCondition
            ? [beforeCondition(customerVisits.startedAt)]
            : []),
        ),
      )
      .orderBy(desc(customerVisits.startedAt))
      .limit(fetchSize);

    // Notes — private notes are only visible to their author or admins.
    // Everyone else just doesn't see them in the timeline; the dedicated
    // notes tab enforces the same rule server-side already.
    const noteRows = await this.db
      .select({
        id: notes.id,
        createdAt: notes.createdAt,
        body: notes.body,
        productId: notes.productId,
        productTitle: products.title,
        isPrivate: notes.isPrivate,
        createdByUserId: notes.createdByUserId,
        createdByName: users.fullName,
      })
      .from(notes)
      .leftJoin(users, eq(notes.createdByUserId, users.id))
      .leftJoin(products, eq(products.id, notes.productId))
      .where(
        and(
          eq(notes.customerId, customerId),
          ...(beforeCondition
            ? [beforeCondition(notes.createdAt)]
            : []),
          user.role === "admin"
            ? sql`true`
            : or(
                eq(notes.isPrivate, false),
                eq(notes.createdByUserId, user.id),
              )!,
        ),
      )
      .orderBy(desc(notes.createdAt))
      .limit(fetchSize);

    type RawEvent = {
      id: string;
      type:
        | "customer_registered"
        | "order"
        | "recommendation"
        | "appointment"
        | "visit"
        | "message"
        | "note";
      occurredAt: Date;
      actor: { id: string | null; name: string | null };
      title: string;
      body: string | null;
      amount: number | null;
      metadata: Record<string, unknown> | null;
    };

    const events: RawEvent[] = [];

    for (const row of orderRows) {
      const total = Number(row.totalPrice);
      const productTitles = row.productTitles ?? [];
      const preview = productTitles.slice(0, 3).join(" · ");
      events.push({
        id: `order:${row.id}`,
        type: "order",
        occurredAt: new Date(row.processedAt),
        actor: { id: row.attributedUserId, name: row.attributedName },
        title: `Compra de $${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        body: preview || null,
        amount: total,
        metadata: { itemCount: productTitles.length },
      });
    }

    for (const row of recommendationRows) {
      events.push({
        id: `recommendation:${row.id}`,
        type: "recommendation",
        occurredAt: new Date(row.recommendedAt),
        actor: { id: row.recommendedByUserId, name: row.recommendedByName },
        title: row.productTitle
          ? `Recomendación: ${row.productTitle}`
          : "Recomendación",
        body: row.notes,
        amount: null,
        metadata: null,
      });
    }

    for (const row of appointmentRows) {
      const isPast = new Date(row.startTime).getTime() < Date.now();
      events.push({
        id: `appointment:${row.id}`,
        type: "appointment",
        occurredAt: new Date(row.startTime),
        actor: { id: row.staffUserId, name: row.staffName },
        title: row.serviceTypeName
          ? `${row.serviceTypeName} (${row.durationMinutes} min)`
          : `Cita (${row.durationMinutes} min)`,
        body: null,
        amount: null,
        metadata: { status: row.status, isPast },
      });
    }

    for (const row of visitRows) {
      const reason = row.visitReason ?? row.bookedReason;
      const reasonLabel = VISIT_REASON_LABEL[reason ?? ""] ?? null;
      const outcomeLabel = VISIT_OUTCOME_LABEL[row.outcome ?? ""] ?? null;
      const sentimentEmoji = VISIT_SENTIMENT_EMOJI[row.sentiment ?? ""] ?? null;

      const title = reasonLabel ? `Visita · ${reasonLabel}` : "Visita";
      const bodyParts: string[] = [];
      if (row.durationMinutes != null) {
        bodyParts.push(`${row.durationMinutes} min`);
      }
      if (outcomeLabel) bodyParts.push(outcomeLabel);
      if (row.status === "abandoned") bodyParts.push("interrumpida");
      if (row.status === "no_show") bodyParts.push("no asistió");
      if (sentimentEmoji) bodyParts.push(sentimentEmoji);

      events.push({
        id: `visit:${row.id}`,
        type: "visit",
        occurredAt: new Date(row.startedAt),
        actor: { id: row.attendedByUserId, name: row.attendedByName },
        title,
        body: bodyParts.length > 0 ? bodyParts.join(" · ") : null,
        amount: null,
        metadata: {
          status: row.status,
          visitReason: row.visitReason,
          bookedReason: row.bookedReason,
          outcome: row.outcome,
          sentiment: row.sentiment,
        },
      });
    }

    for (const row of messageRows) {
      events.push({
        id: `message:${row.id}`,
        type: "message",
        occurredAt: new Date(row.sentAt),
        actor: { id: row.sentByUserId, name: row.sentByName },
        title: `Mensaje por ${row.channel}`,
        body: row.subject ?? row.body.slice(0, 140),
        amount: null,
        metadata: { channel: row.channel, campaignType: row.campaignType },
      });
    }

    for (const row of noteRows) {
      events.push({
        id: `note:${row.id}`,
        type: "note",
        occurredAt: new Date(row.createdAt),
        actor: { id: row.createdByUserId, name: row.createdByName },
        title: row.productTitle
          ? `Nota · ${row.productTitle}`
          : "Nota",
        body: row.body,
        amount: null,
        metadata: {
          isPrivate: row.isPrivate,
          productId: row.productId,
        },
      });
    }

    // Synthetic registration event — only emit on the oldest page so it shows
    // up at the bottom of the timeline (as designed in the spec mockup).
    const enrolledAt = new Date(customer.enrolledAt);
    if (!opts.before || enrolledAt <= opts.before) {
      const [registeredBy] = customer.createdByUserId
        ? await this.db
            .select({ id: users.id, fullName: users.fullName })
            .from(users)
            .where(eq(users.id, customer.createdByUserId))
        : [];

      events.push({
        id: `registration:${customer.id}`,
        type: "customer_registered",
        occurredAt: enrolledAt,
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
        birthday: data.birthday
          ? data.birthday.toISOString().split("T")[0]
          : undefined,
        signupStoreId: storeId,
        createdByUserId: user.id,
        assignedToUserId: user.id,
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

    const channels = data.consents.marketingChannels;

    const customer = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(customers)
        .values({
          ...data.customer,
          birthday: data.customer.birthday
            ? data.customer.birthday.toISOString().split("T")[0]
            : undefined,
          signupStoreId: storeId,
          createdByUserId: user.id,
          assignedToUserId: user.id,
          // Denormalized marketing flags — kept in sync with `consents` rows
          // so list queries don't have to join consents on every render.
          acceptsMarketingEmail: channels.email === true,
          acceptsMarketingSms: channels.sms === true,
          acceptsMarketingWhatsapp: channels.whatsapp === true,
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
        Object.entries(channels) as [
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
   * Returns minimal metadata only — never leaks PII from stores the advisor
   * can't access. The `inUserScope` flag tells the UI whether the advisor
   * can open the existing profile or needs to call support to claim it.
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
        storeId: customers.signupStoreId,
        storeName: stores.displayName,
      })
      .from(customers)
      .leftJoin(stores, eq(customers.signupStoreId, stores.id))
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
        birthday: data.birthday
          ? data.birthday.toISOString().split("T")[0]
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

  /**
   * Reassign a customer to a different BA. Allowed for counter_manager and up.
   * The target BA must work in a store the caller can reach AND in the same
   * store as the customer's signup store — otherwise the new BA would not be
   * able to see the customer they're assigned to.
   */
  async reassign(
    customerId: string,
    data: ReassignCustomerDto,
    user: SessionUser,
  ) {
    if (
      user.role !== UserRole.COUNTER_MANAGER &&
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Only counter managers and up can reassign customers",
      );
    }

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) throw new NotFoundException("Customer not found");

    // Caller must have access to the customer.
    await this.scopeService.assertCustomerAccess(customerId, user);

    // Target BA must exist and be active.
    const [targetUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, data.newAssignedToUserId));
    if (!targetUser) throw new NotFoundException("Target advisor not found");
    if (!targetUser.isActive) {
      throw new BadRequestException("Target advisor is inactive");
    }

    // Counter Manager can only reassign within their own store.
    if (user.role === UserRole.COUNTER_MANAGER) {
      if (
        customer.signupStoreId !== user.storeId ||
        targetUser.storeId !== user.storeId
      ) {
        throw new ForbiddenException(
          "Counter Manager can only reassign within their own store",
        );
      }
    }

    // For higher roles: target BA must work in the customer's store (otherwise
    // they would not see the customer).
    if (
      targetUser.storeId &&
      targetUser.storeId !== customer.signupStoreId
    ) {
      throw new BadRequestException(
        "Target advisor does not work at the customer's store",
      );
    }

    const previousAssigneeId = customer.assignedToUserId;

    const [updated] = await this.db
      .update(customers)
      .set({
        assignedToUserId: data.newAssignedToUserId,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    await this.auditService.log(
      user,
      "customer_reassigned",
      "customer",
      customerId,
      {
        from: previousAssigneeId,
        to: data.newAssignedToUserId,
        reason: data.reason ?? null,
      },
    );

    return updated;
  }

  async search(query: string, type: string, user: SessionUser) {
    const scope = await this.scopeService.scopeByStore(
      user,
      customers.signupStoreId,
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

    // Rank under the hood for ordering, but return full Customer rows so
    // every UI consumer (global search, agenda picker, registration
    // wizard, follow-ups form) gets a familiar shape.
    const ranked = rankCustomerSearchResults({
      results: rows.map((r) => ({
        customerId: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        lastInteractionAt: r.lastInteractionAt,
        lastOrderAt: r.lastOrderAt,
        assignedToUserId: r.assignedToUserId,
        lifecycleStage: r.lifecycleStage as any,
        textMatchScore: 50, // base score for ilike matches
      })),
      searchingUserId: user.id,
    });

    const orderById = new Map(
      ranked.map((r, i) => [r.customer.customerId, i]),
    );
    return rows
      .slice()
      .sort(
        (a, b) =>
          (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
  }

  /**
   * LFPDPPP "derecho al olvido" (ARCO-O): strip the customer's PII while
   * preserving the integrity of historical analytics. Orders, appointments,
   * messages, recommendations and samples reference the customer with a
   * notNull FK, so we can't just null them out — that would either violate
   * the constraint or, worse, silently bypass it via `as any` (the previous
   * bug). Instead we keep the same row id, blank the PII columns and flip
   * `isActive = false`. The audit log records the folio + original name so
   * the original identity can still be proven from the audit trail when a
   * regulator asks.
   */
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
    const now = new Date();

    await this.db.transaction(async (tx) => {
      // 1. Delete shade matches (via beauty profile)
      const [profile] = await tx
        .select({ id: beautyProfiles.id })
        .from(beautyProfiles)
        .where(eq(beautyProfiles.customerId, customerId));

      if (profile) {
        await tx
          .delete(shadeMatches)
          .where(eq(shadeMatches.beautyProfileId, profile.id));
        await tx
          .delete(beautyProfiles)
          .where(eq(beautyProfiles.customerId, customerId));
      }

      // 2. Drop consents — the ARCO request itself is the new auth-of-record
      //    for what the customer agreed to.
      await tx.delete(consents).where(eq(consents.customerId, customerId));

      // 3. Anonymize the customer row in place. Keeps the FK from
      //    orders/appointments/etc. valid while removing every PII column.
      //    `isActive=false` keeps the row out of advisor lists.
      await tx
        .update(customers)
        .set({
          firstName: anonymized,
          lastName: "(anonymized)",
          email: null,
          phone: null,
          avatarUrl: null,
          gender: null,
          birthday: null,
          taxId: null,
          preferredChannel: null,
          acceptsMarketingEmail: false,
          acceptsMarketingSms: false,
          acceptsMarketingWhatsapp: false,
          isActive: false,
          assignedToUserId: null,
          updatedAt: now,
        })
        .where(eq(customers.id, customerId));
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
 * The DB stores `birthday` as a `date` column. We pull `month` and `day`
 * out and compare via day-of-year math so a December birthday still matches
 * when "today" is late December and the window extends into January.
 */
function birthdayWithinDaysCondition(days: number) {
  return sql`
    ${customers.birthday} IS NOT NULL AND (
      (
        make_date(
          extract(year from current_date)::int,
          extract(month from ${customers.birthday})::int,
          extract(day from ${customers.birthday})::int
        ) BETWEEN current_date AND current_date + (${days} || ' days')::interval
      )
      OR
      (
        -- Wrap-around: if the window crosses Jan 1, also include birthdays
        -- that fall in the early days of next year.
        make_date(
          extract(year from current_date)::int + 1,
          extract(month from ${customers.birthday})::int,
          extract(day from ${customers.birthday})::int
        ) BETWEEN current_date AND current_date + (${days} || ' days')::interval
      )
    )
  `;
}

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customerVisits,
  customers,
  users,
  stores,
  appointments,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import type {
  StartVisitDto,
  UpdateVisitDto,
  CloseVisitDto,
  AbandonVisitDto,
} from "../../dtos/customer-visits.dto";

@Injectable()
export class CustomerVisitsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
  ) {}

  async findAll(
    user: SessionUser,
    filters?: {
      customerId?: string;
      storeId?: string;
      attendedByUserId?: string;
      status?: string;
      visitReason?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const conditions: any[] = [];

    // BAs only see visits they attended. Manager+ uses store scope.
    if (user.role === "beauty_advisor") {
      conditions.push(eq(customerVisits.attendedByUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(
        user,
        customerVisits.storeId,
      );
      if (scope) conditions.push(scope);
      if (filters?.attendedByUserId) {
        conditions.push(
          eq(customerVisits.attendedByUserId, filters.attendedByUserId),
        );
      }
    }

    if (filters?.customerId) {
      conditions.push(eq(customerVisits.customerId, filters.customerId));
    }
    if (filters?.storeId) {
      conditions.push(eq(customerVisits.storeId, filters.storeId));
    }
    if (filters?.status) {
      conditions.push(eq(customerVisits.status, filters.status));
    }
    if (filters?.visitReason) {
      conditions.push(eq(customerVisits.visitReason, filters.visitReason));
    }
    if (filters?.from) {
      conditions.push(gte(customerVisits.startedAt, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(customerVisits.startedAt, filters.to));
    }

    const rows = await this.db
      .select({
        visit: customerVisits,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          lifecycleStage: customers.lifecycleStage,
        },
        attendedBy: {
          id: users.id,
          fullName: users.fullName,
        },
        store: {
          id: stores.id,
          displayName: stores.displayName,
        },
      })
      .from(customerVisits)
      .leftJoin(customers, eq(customerVisits.customerId, customers.id))
      .leftJoin(users, eq(customerVisits.attendedByUserId, users.id))
      .leftJoin(stores, eq(customerVisits.storeId, stores.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customerVisits.startedAt));

    return rows.map((r) => ({
      ...r.visit,
      customer: r.customer,
      attendedBy: r.attendedBy,
      store: r.store,
    }));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        visit: customerVisits,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          email: customers.email,
          lifecycleStage: customers.lifecycleStage,
        },
        attendedBy: {
          id: users.id,
          fullName: users.fullName,
        },
        store: {
          id: stores.id,
          displayName: stores.displayName,
        },
      })
      .from(customerVisits)
      .leftJoin(customers, eq(customerVisits.customerId, customers.id))
      .leftJoin(users, eq(customerVisits.attendedByUserId, users.id))
      .leftJoin(stores, eq(customerVisits.storeId, stores.id))
      .where(eq(customerVisits.id, id));

    if (!row) throw new NotFoundException("Visit not found");

    return {
      ...row.visit,
      customer: row.customer,
      attendedBy: row.attendedBy,
      store: row.store,
    };
  }

  /** Customer timeline — every visit, newest first. */
  async findByCustomer(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);
    return this.db
      .select()
      .from(customerVisits)
      .where(eq(customerVisits.customerId, customerId))
      .orderBy(desc(customerVisits.startedAt));
  }

  /**
   * Start a new visit. Walk-ins omit `appointmentId`; arrivals from a
   * booking pass it so the visit links back to the planned record.
   *
   * Visit number is assigned atomically — count + 1 inside the transaction.
   */
  async start(data: StartVisitDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    // If linked to an appointment, validate it belongs to this BA's store
    // and to the same customer. Otherwise reject early to avoid a confusing
    // FK violation downstream.
    if (data.appointmentId) {
      const [appt] = await this.db
        .select({
          id: appointments.id,
          customerId: appointments.customerId,
          storeId: appointments.storeId,
        })
        .from(appointments)
        .where(eq(appointments.id, data.appointmentId));
      if (!appt) throw new NotFoundException("Appointment not found");
      if (appt.customerId !== data.customerId) {
        throw new BadRequestException(
          "Appointment belongs to a different customer",
        );
      }
      if (appt.storeId !== storeId) {
        throw new BadRequestException(
          "Appointment belongs to a different store",
        );
      }
    }

    return this.db.transaction(async (tx) => {
      const [{ count }] = await tx
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(customerVisits)
        .where(eq(customerVisits.customerId, data.customerId));

      const [visit] = await tx
        .insert(customerVisits)
        .values({
          customerId: data.customerId,
          storeId,
          attendedByUserId: user.id,
          appointmentId: data.appointmentId,
          visitChannel: data.visitChannel ?? "in_store",
          visitNumber: (count ?? 0) + 1,
          bookedReason: data.bookedReason,
          partySize: data.partySize ?? 1,
          startedAt: data.startedAt ?? new Date(),
          status: "in_progress",
        })
        .returning();

      await this.customerActivity.touchInteraction(data.customerId, new Date(), tx);

      await this.auditService.log(user, "start", "customer_visit", visit.id, {
        customerId: data.customerId,
        appointmentId: data.appointmentId,
      });

      return visit;
    });
  }

  async update(id: string, data: UpdateVisitDto, user: SessionUser) {
    const existing = await this.findOne(id);
    this.assertCanModify(existing, user);
    if (existing.status !== "in_progress") {
      throw new BadRequestException(
        "Cannot edit a visit that is not in progress",
      );
    }

    const [updated] = await this.db
      .update(customerVisits)
      .set({
        visitChannel: data.visitChannel ?? existing.visitChannel,
        bookedReason:
          data.bookedReason === null
            ? null
            : data.bookedReason ?? existing.bookedReason,
        partySize: data.partySize ?? existing.partySize,
        notes: data.notes ?? existing.notes,
        productsViewed: data.productsViewed ?? existing.productsViewed,
        updatedAt: new Date(),
      })
      .where(eq(customerVisits.id, id))
      .returning();

    await this.auditService.log(user, "update", "customer_visit", id, {
      ...data,
    });
    return updated;
  }

  /**
   * Close a visit. Required at this point: visitReason + outcome. Closing
   * also stamps endedAt and computes durationMinutes from startedAt.
   */
  async close(id: string, data: CloseVisitDto, user: SessionUser) {
    const existing = await this.findOne(id);
    this.assertCanModify(existing, user);
    if (existing.status !== "in_progress") {
      throw new BadRequestException(
        `Cannot close a visit with status ${existing.status}`,
      );
    }

    const endedAt = data.endedAt ?? new Date();
    const startedAt = new Date(existing.startedAt);
    const durationMinutes = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000),
    );

    const [closed] = await this.db
      .update(customerVisits)
      .set({
        status: "completed",
        visitReason: data.visitReason,
        outcome: data.outcome,
        sentiment: data.sentiment,
        notes: data.notes ?? existing.notes,
        productsViewed: data.productsViewed ?? existing.productsViewed,
        convertedOrderId: data.convertedOrderId,
        followUpDate: data.followUpDate,
        endedAt,
        durationMinutes,
        updatedAt: new Date(),
      })
      .where(eq(customerVisits.id, id))
      .returning();

    await this.customerActivity.touchInteraction(
      existing.customerId,
      endedAt,
    );

    await this.auditService.log(user, "close", "customer_visit", id, {
      visitReason: data.visitReason,
      outcome: data.outcome,
    });

    return closed;
  }

  /** Mark a visit as abandoned (customer left mid-consultation). */
  async abandon(id: string, data: AbandonVisitDto, user: SessionUser) {
    const existing = await this.findOne(id);
    this.assertCanModify(existing, user);
    if (existing.status !== "in_progress") {
      throw new BadRequestException(
        `Cannot abandon a visit with status ${existing.status}`,
      );
    }

    const endedAt = new Date();
    const durationMinutes = Math.max(
      0,
      Math.round((endedAt.getTime() - new Date(existing.startedAt).getTime()) / 60_000),
    );

    const [abandoned] = await this.db
      .update(customerVisits)
      .set({
        status: "abandoned",
        notes: data.notes ?? existing.notes,
        endedAt,
        durationMinutes,
        updatedAt: new Date(),
      })
      .where(eq(customerVisits.id, id))
      .returning();

    await this.auditService.log(user, "abandon", "customer_visit", id, {});
    return abandoned;
  }

  /**
   * BA can only modify their own visits. Manager+ can modify any visit
   * in their store scope.
   */
  private assertCanModify(
    visit: { attendedByUserId: string; storeId: string },
    user: SessionUser,
  ) {
    if (user.role === "beauty_advisor" && visit.attendedByUserId !== user.id) {
      throw new BadRequestException(
        "BAs can only modify their own visits",
      );
    }
  }
}

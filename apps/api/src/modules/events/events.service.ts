import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  storeEvents,
  eventInvitations,
  eventAssignments,
  customers,
  users,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateEventDto,
  CreateMultiStoreEventDto,
  UpdateEventDto,
  ListEventsQueryDto,
  InviteCustomerDto,
  InviteCustomersDto,
  UpdateRsvpDto,
  AssignBaToEventDto,
} from "../../dtos/events.dto";

@Injectable()
export class EventsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async list(query: ListEventsQueryDto, user: SessionUser) {
    const storeScope = await this.scopeService.scopeByStore(
      user,
      storeEvents.storeId,
    );

    const conditions = [
      ...(storeScope ? [storeScope] : []),
      ...(query.storeId ? [eq(storeEvents.storeId, query.storeId)] : []),
      ...(query.brandId ? [eq(storeEvents.brandId, query.brandId)] : []),
      ...(query.status ? [eq(storeEvents.status, query.status)] : []),
      ...(query.from ? [gte(storeEvents.startTime, new Date(query.from))] : []),
      ...(query.to ? [lte(storeEvents.startTime, new Date(query.to))] : []),
    ];

    return this.db
      .select()
      .from(storeEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(storeEvents.startTime));
  }

  async findOne(id: string, user: SessionUser) {
    const [event] = await this.db
      .select()
      .from(storeEvents)
      .where(eq(storeEvents.id, id));
    if (!event) throw new NotFoundException("Event not found");

    if (user.role !== "admin") {
      const accessible = await this.scopeService.getAccessibleStoreIds(user);
      if (!accessible.includes(event.storeId)) {
        throw new NotFoundException("Event not found");
      }
    }

    const [stats] = await this.db
      .select({
        invited: sql<number>`count(*)`,
        accepted: sql<number>`count(*) filter (where ${eventInvitations.rsvpStatus} = 'accepted')`,
        declined: sql<number>`count(*) filter (where ${eventInvitations.rsvpStatus} = 'declined')`,
        waitlist: sql<number>`count(*) filter (where ${eventInvitations.rsvpStatus} = 'waitlist')`,
        attended: sql<number>`count(*) filter (where ${eventInvitations.attendedAt} is not null)`,
      })
      .from(eventInvitations)
      .where(eq(eventInvitations.storeEventId, id));

    return {
      ...event,
      stats: {
        invited: Number(stats?.invited ?? 0),
        accepted: Number(stats?.accepted ?? 0),
        declined: Number(stats?.declined ?? 0),
        waitlist: Number(stats?.waitlist ?? 0),
        attended: Number(stats?.attended ?? 0),
      },
    };
  }

  async create(data: CreateEventDto, user: SessionUser) {
    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    if (user.role !== "admin" && !accessible.includes(data.storeId)) {
      throw new NotFoundException("Store not accessible");
    }

    const [event] = await this.db
      .insert(storeEvents)
      .values({
        storeId: data.storeId,
        brandId: data.brandId,
        name: data.name,
        description: data.description,
        kind: data.kind,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        capacity: data.capacity,
        coverImageUrl: data.coverImageUrl,
      })
      .returning();

    await this.auditService.log(user, "create", "store_event", event.id, {
      storeId: data.storeId,
      kind: data.kind,
    });

    return event;
  }

  /**
   * Creates the same event in N stores at once. Every row produced shares an
   * `eventGroupId`, which lets the UI surface the rollout as a single
   * logical event and lets downstream queries aggregate stats across stores.
   * Each storeId is validated against the user's scope before insert.
   */
  async createMultiStore(data: CreateMultiStoreEventDto, user: SessionUser) {
    if (data.storeIds.length === 0) {
      throw new ForbiddenException("storeIds must contain at least one store");
    }

    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    if (user.role !== "admin") {
      const inaccessible = data.storeIds.filter((id) => !accessible.includes(id));
      if (inaccessible.length > 0) {
        throw new ForbiddenException(
          `Some stores are not accessible: ${inaccessible.join(", ")}`,
        );
      }
    }

    const eventGroupId = randomUUID();
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    const inserted = await this.db
      .insert(storeEvents)
      .values(
        data.storeIds.map((storeId) => ({
          storeId,
          brandId: data.brandId,
          eventGroupId,
          name: data.name,
          description: data.description,
          kind: data.kind,
          startTime,
          endTime,
          capacity: data.capacity,
          coverImageUrl: data.coverImageUrl,
        })),
      )
      .returning();

    await this.auditService.log(user, "create_multi_store", "store_event", eventGroupId, {
      eventGroupId,
      storeIds: data.storeIds,
      kind: data.kind,
      count: inserted.length,
    });

    return {
      eventGroupId,
      count: inserted.length,
      events: inserted,
    };
  }

  async update(id: string, data: UpdateEventDto, user: SessionUser) {
    await this.findOne(id, user);

    const [updated] = await this.db
      .update(storeEvents)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startTime !== undefined && {
          startTime: new Date(data.startTime),
        }),
        ...(data.endTime !== undefined && { endTime: new Date(data.endTime) }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.coverImageUrl !== undefined && {
          coverImageUrl: data.coverImageUrl,
        }),
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: new Date(),
      })
      .where(eq(storeEvents.id, id))
      .returning();

    await this.auditService.log(user, "update", "store_event", id, {});
    return updated;
  }

  async remove(id: string, user: SessionUser) {
    await this.findOne(id, user);
    await this.db.delete(storeEvents).where(eq(storeEvents.id, id));
    await this.auditService.log(user, "delete", "store_event", id, {});
    return { id, deleted: true };
  }

  async listInvitees(eventId: string, user: SessionUser) {
    await this.findOne(eventId, user);

    return this.db
      .select({
        id: eventInvitations.id,
        customerId: eventInvitations.customerId,
        invitedByUserId: eventInvitations.invitedByUserId,
        rsvpStatus: eventInvitations.rsvpStatus,
        rsvpAt: eventInvitations.rsvpAt,
        attendedAt: eventInvitations.attendedAt,
        createdAt: eventInvitations.createdAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerTier: customers.loyaltyTier,
      })
      .from(eventInvitations)
      .innerJoin(customers, eq(customers.id, eventInvitations.customerId))
      .where(eq(eventInvitations.storeEventId, eventId))
      .orderBy(desc(eventInvitations.createdAt));
  }

  async invite(eventId: string, data: InviteCustomerDto, user: SessionUser) {
    await this.findOne(eventId, user);
    await this.scopeService.assertCustomerAccess(data.customerId, user);

    const [existing] = await this.db
      .select({ id: eventInvitations.id })
      .from(eventInvitations)
      .where(
        and(
          eq(eventInvitations.storeEventId, eventId),
          eq(eventInvitations.customerId, data.customerId),
        ),
      );
    if (existing) {
      throw new ConflictException("Customer already invited");
    }

    const [invitation] = await this.db
      .insert(eventInvitations)
      .values({
        storeEventId: eventId,
        customerId: data.customerId,
        invitedByUserId: user.id,
      })
      .returning();

    await this.auditService.log(user, "invite", "store_event", eventId, {
      customerId: data.customerId,
    });

    return invitation;
  }

  async inviteBulk(
    eventId: string,
    data: InviteCustomersDto,
    user: SessionUser,
  ) {
    await this.findOne(eventId, user);

    for (const cid of data.customerIds) {
      await this.scopeService.assertCustomerAccess(cid, user);
    }

    const existing = await this.db
      .select({ customerId: eventInvitations.customerId })
      .from(eventInvitations)
      .where(eq(eventInvitations.storeEventId, eventId));
    const taken = new Set(existing.map((r) => r.customerId));

    const toInsert = data.customerIds
      .filter((cid) => !taken.has(cid))
      .map((cid) => ({
        storeEventId: eventId,
        customerId: cid,
        invitedByUserId: user.id,
      }));

    if (!toInsert.length) return { inserted: 0, skipped: data.customerIds.length };

    const inserted = await this.db
      .insert(eventInvitations)
      .values(toInsert)
      .returning();

    await this.auditService.log(user, "invite_bulk", "store_event", eventId, {
      inserted: inserted.length,
      skipped: data.customerIds.length - inserted.length,
    });

    return {
      inserted: inserted.length,
      skipped: data.customerIds.length - inserted.length,
    };
  }

  async updateRsvp(
    eventId: string,
    invitationId: string,
    data: UpdateRsvpDto,
    user: SessionUser,
  ) {
    await this.findOne(eventId, user);

    const [updated] = await this.db
      .update(eventInvitations)
      .set({
        rsvpStatus: data.rsvpStatus,
        rsvpAt: new Date(),
      })
      .where(
        and(
          eq(eventInvitations.id, invitationId),
          eq(eventInvitations.storeEventId, eventId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException("Invitation not found");
    return updated;
  }

  async markAttended(
    eventId: string,
    invitationId: string,
    user: SessionUser,
  ) {
    await this.findOne(eventId, user);

    const [updated] = await this.db
      .update(eventInvitations)
      .set({ attendedAt: new Date() })
      .where(
        and(
          eq(eventInvitations.id, invitationId),
          eq(eventInvitations.storeEventId, eventId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException("Invitation not found");
    return updated;
  }

  async removeInvitation(
    eventId: string,
    invitationId: string,
    user: SessionUser,
  ) {
    await this.findOne(eventId, user);

    const [deleted] = await this.db
      .delete(eventInvitations)
      .where(
        and(
          eq(eventInvitations.id, invitationId),
          eq(eventInvitations.storeEventId, eventId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundException("Invitation not found");
    return { id: invitationId, deleted: true };
  }

  // ── Staff assignments ─────────────────────────────────────────────────

  async listAssignments(eventId: string, user: SessionUser) {
    await this.findOne(eventId, user);

    return this.db
      .select({
        id: eventAssignments.id,
        userId: eventAssignments.userId,
        userFullName: users.fullName,
        userSpecialty: users.specialty,
        role: eventAssignments.role,
        assignedByUserId: eventAssignments.assignedByUserId,
        createdAt: eventAssignments.createdAt,
      })
      .from(eventAssignments)
      .leftJoin(users, eq(users.id, eventAssignments.userId))
      .where(eq(eventAssignments.storeEventId, eventId))
      .orderBy(desc(eventAssignments.createdAt));
  }

  async assignBa(
    eventId: string,
    data: AssignBaToEventDto,
    user: SessionUser,
  ) {
    await this.findOne(eventId, user);

    const [existing] = await this.db
      .select({ id: eventAssignments.id })
      .from(eventAssignments)
      .where(
        and(
          eq(eventAssignments.storeEventId, eventId),
          eq(eventAssignments.userId, data.userId),
        ),
      );
    if (existing) {
      throw new ConflictException("BA is already assigned to this event");
    }

    const [assignment] = await this.db
      .insert(eventAssignments)
      .values({
        storeEventId: eventId,
        userId: data.userId,
        role: data.role ?? "staff",
        assignedByUserId: user.id,
      })
      .returning();

    await this.auditService.log(user, "assign_ba", "store_event", eventId, {
      userId: data.userId,
      role: data.role ?? "staff",
    });

    return assignment;
  }

  async unassignBa(eventId: string, assignmentId: string, user: SessionUser) {
    await this.findOne(eventId, user);

    const [deleted] = await this.db
      .delete(eventAssignments)
      .where(
        and(
          eq(eventAssignments.id, assignmentId),
          eq(eventAssignments.storeEventId, eventId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundException("Assignment not found");

    await this.auditService.log(user, "unassign_ba", "store_event", eventId, {
      assignmentId,
    });

    return { id: assignmentId, deleted: true };
  }
}

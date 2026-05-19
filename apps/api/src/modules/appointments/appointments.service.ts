import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { appointments, customers, users, stores, appointmentEventTypes } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import type { CreateAppointmentDto, UpdateAppointmentDto } from "../../dtos/appointments.dto";

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async findAll(user: SessionUser, filters?: { from?: Date; to?: Date }) {
    const conditions: any[] = [];

    // BA sees only their appointments; manager/supervisor/admin see by store scope
    if (user.role === "ba") {
      conditions.push(eq(appointments.baUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(user, appointments.storeId);
      if (scope) conditions.push(scope);
    }

    if (filters?.from) conditions.push(gte(appointments.scheduledAt, filters.from));
    if (filters?.to) conditions.push(lte(appointments.scheduledAt, filters.to));

    const rows = await this.db
      .select({
        appointment: appointments,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          email: customers.email,
          lifecycleSegment: customers.lifecycleSegment,
        },
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(appointments.scheduledAt));

    return rows.map((r) => ({ ...r.appointment, customer: r.customer }));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        appointment: appointments,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          email: customers.email,
          lifecycleSegment: customers.lifecycleSegment,
        },
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(eq(appointments.id, id));
    if (!row) throw new NotFoundException("Appointment not found");
    return { ...row.appointment, customer: row.customer };
  }

  async create(data: CreateAppointmentDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    // Fall back to the first active event type if the client somehow omitted
    // the field (e.g. the dropdown rendered empty). Without this the INSERT
    // hits a NOT NULL violation that surfaces as an opaque 500.
    let eventTypeId = data.eventTypeId;
    if (!eventTypeId) {
      const [fallback] = await this.db
        .select({ id: appointmentEventTypes.id })
        .from(appointmentEventTypes)
        .where(eq(appointmentEventTypes.active, true))
        .orderBy(appointmentEventTypes.sortOrder)
        .limit(1);
      if (!fallback) {
        throw new NotFoundException(
          "No hay tipos de cita configurados. Crea al menos uno antes de agendar.",
        );
      }
      eventTypeId = fallback.id;
    }

    const [appt] = await this.db
      .insert(appointments)
      .values({
        customerId: data.customerId,
        baUserId: user.id,
        storeId,
        eventTypeId,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes,
        comments: data.comments,
        isVirtual: data.isVirtual ?? false,
        videoLink: data.videoLink,
      })
      .returning();
    return appt;
  }

  async update(id: string, data: UpdateAppointmentDto, user: SessionUser) {
    const existing = await this.findOne(id);

    // If rescheduling: create new appointment linked to old one
    if (data.status === "rescheduled" && data.scheduledAt) {
      await this.db
        .update(appointments)
        .set({ status: "rescheduled", updatedAt: new Date() })
        .where(eq(appointments.id, id));

      const [newAppt] = await this.db
        .insert(appointments)
        .values({
          customerId: existing.customerId,
          baUserId: existing.baUserId,
          storeId: existing.storeId,
          eventTypeId: existing.eventTypeId,
          scheduledAt: new Date(data.scheduledAt),
          durationMinutes: data.durationMinutes ?? existing.durationMinutes,
          comments: data.comments ?? existing.comments,
          isVirtual: existing.isVirtual,
          videoLink: existing.videoLink,
          rescheduledFromAppointmentId: id,
        })
        .returning();
      return newAppt;
    }

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);

    const [updated] = await this.db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async getCalendar(
    from: Date,
    to: Date,
    user: SessionUser,
    options?: { baUserId?: string; storeView?: boolean },
  ) {
    const conditions: any[] = [
      gte(appointments.scheduledAt, from),
      lte(appointments.scheduledAt, to),
    ];

    if (options?.baUserId) {
      // Viewing a specific BA's calendar
      conditions.push(eq(appointments.baUserId, options.baUserId));
    } else if (options?.storeView && user.role !== "ba") {
      // Store view: manager+ sees all BAs in their store scope
      const scope = await this.scopeService.scopeByStore(user, appointments.storeId);
      if (scope) conditions.push(scope);
    } else if (user.role === "ba") {
      conditions.push(eq(appointments.baUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(user, appointments.storeId);
      if (scope) conditions.push(scope);
    }

    const rows = await this.db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        eventTypeId: appointments.eventTypeId,
        eventTypeName: appointmentEventTypes.displayName,
        eventTypeColor: appointmentEventTypes.color,
        status: appointments.status,
        comments: appointments.comments,
        isVirtual: appointments.isVirtual,
        customerId: appointments.customerId,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        customerPhone: customers.phone,
        customerSegment: customers.lifecycleSegment,
        baUserId: appointments.baUserId,
        baName: users.fullName,
        storeId: appointments.storeId,
        storeName: stores.displayName,
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(users, eq(appointments.baUserId, users.id))
      .leftJoin(stores, eq(appointments.storeId, stores.id))
      .leftJoin(appointmentEventTypes, eq(appointments.eventTypeId, appointmentEventTypes.id))
      .where(and(...conditions))
      .orderBy(appointments.scheduledAt);

    return rows;
  }
}

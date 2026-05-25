import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { appointments, customers, users, stores, serviceTypes } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import type { CreateAppointmentDto, UpdateAppointmentDto } from "../../dtos/appointments.dto";

const SLOT_GRID_MINUTES = 30;

// Statuses that consume a slot. Cancelled / rescheduled / no_show free it up.
const BLOCKING_STATUSES = ["scheduled", "confirmed", "completed"];

// Fallback when a store has no hours configured. Wide enough to never produce
// "no availability" for a store that simply forgot to upload its schedule.
const FALLBACK_OPEN_MINUTES = 10 * 60; // 10:00
const FALLBACK_CLOSE_MINUTES = 21 * 60; // 21:00

const DAY_TOKENS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayToken = (typeof DAY_TOKENS)[number];

/**
 * Parse a store-hours range string like "11:00-21:00" into minutes-from-midnight.
 * Returns null when the input is missing or malformed (e.g. "closed").
 */
function parseRangeMinutes(
  range: string | undefined,
): { open: number; close: number } | null {
  if (!range) return null;
  const match = range.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const open = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const close = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
  if (close <= open) return null;
  return { open, close };
}

/**
 * Resolve store opening hours for a given day-of-week. The `hours.store` JSON
 * keys can be a single day ("sun") or a hyphenated range ("mon-sat"). The
 * most specific (single-day) key wins so stores can override one day inside a
 * range without rewriting the whole schedule.
 */
function resolveDayHours(
  hours: { store?: Record<string, string> } | null | undefined,
  dayOfWeek: number, // 0 = Sunday, 6 = Saturday
): { open: number; close: number } | null {
  if (!hours?.store) return null;
  const target = DAY_TOKENS[dayOfWeek];

  // 1) Exact single-day key wins.
  for (const [key, range] of Object.entries(hours.store)) {
    if (key === target) return parseRangeMinutes(range);
  }
  // 2) Otherwise match the first range that contains this day.
  for (const [key, range] of Object.entries(hours.store)) {
    const match = key.match(/^([a-z]{3})-([a-z]{3})$/);
    if (!match) continue;
    const startIdx = DAY_TOKENS.indexOf(match[1] as DayToken);
    const endIdx = DAY_TOKENS.indexOf(match[2] as DayToken);
    if (startIdx === -1 || endIdx === -1) continue;
    // Ranges in seed data wrap forward only (mon-sat, mon-sun, mon-fri).
    const inRange =
      startIdx <= endIdx
        ? dayOfWeek >= startIdx && dayOfWeek <= endIdx
        : dayOfWeek >= startIdx || dayOfWeek <= endIdx;
    if (inRange) return parseRangeMinutes(range);
  }
  return null;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async findAll(
    user: SessionUser,
    filters?: { from?: Date; to?: Date; staffUserId?: string },
  ) {
    const conditions: any[] = [];

    // BAs only ever see their own list — `staffUserId` from the query is
    // ignored for them so they can't snoop on coworkers. Managers and
    // above use it as an explicit filter on top of their store scope.
    if (user.role === "ba") {
      conditions.push(eq(appointments.staffUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(user, appointments.storeId);
      if (scope) conditions.push(scope);
      if (filters?.staffUserId) {
        conditions.push(eq(appointments.staffUserId, filters.staffUserId));
      }
    }

    if (filters?.from) conditions.push(gte(appointments.startTime, filters.from));
    if (filters?.to) conditions.push(lte(appointments.startTime, filters.to));

    const rows = await this.db
      .select({
        appointment: appointments,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          email: customers.email,
          lifecycleStage: customers.lifecycleStage,
        },
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(appointments.startTime));

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
          lifecycleStage: customers.lifecycleStage,
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

    // Fall back to the first active service type if the client somehow omitted
    // the field (e.g. the dropdown rendered empty). Without this the INSERT
    // hits a NOT NULL violation that surfaces as an opaque 500.
    let serviceTypeId = data.serviceTypeId;
    if (!serviceTypeId) {
      const [fallback] = await this.db
        .select({ id: serviceTypes.id })
        .from(serviceTypes)
        .where(eq(serviceTypes.isActive, true))
        .orderBy(serviceTypes.sortOrder)
        .limit(1);
      if (!fallback) {
        throw new NotFoundException(
          "No hay tipos de cita configurados. Crea al menos uno antes de agendar.",
        );
      }
      serviceTypeId = fallback.id;
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000);

    const [appt] = await this.db
      .insert(appointments)
      .values({
        customerId: data.customerId,
        staffUserId: user.id,
        storeId,
        serviceTypeId,
        startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        isVirtual: data.isVirtual ?? false,
        meetingUrl: data.meetingUrl,
      })
      .returning();
    return appt;
  }

  async update(id: string, data: UpdateAppointmentDto, user: SessionUser) {
    const existing = await this.findOne(id);

    // If rescheduling: create new appointment linked to old one
    if (data.status === "rescheduled" && data.startTime) {
      await this.db
        .update(appointments)
        .set({ status: "rescheduled", updatedAt: new Date() })
        .where(eq(appointments.id, id));

      const newStart = new Date(data.startTime);
      const newDuration = data.durationMinutes ?? existing.durationMinutes;
      const newEnd = new Date(newStart.getTime() + newDuration * 60_000);

      const [newAppt] = await this.db
        .insert(appointments)
        .values({
          customerId: existing.customerId,
          staffUserId: existing.staffUserId,
          storeId: existing.storeId,
          serviceTypeId: existing.serviceTypeId,
          startTime: newStart,
          endTime: newEnd,
          durationMinutes: newDuration,
          notes: data.notes ?? existing.notes,
          isVirtual: existing.isVirtual,
          meetingUrl: existing.meetingUrl,
          rescheduledFromAppointmentId: id,
        })
        .returning();
      return newAppt;
    }

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.startTime) {
      const newStart = new Date(data.startTime);
      updateData.startTime = newStart;
      const duration = data.durationMinutes ?? existing.durationMinutes;
      updateData.endTime = new Date(newStart.getTime() + duration * 60_000);
    } else if (data.durationMinutes !== undefined) {
      updateData.endTime = new Date(
        existing.startTime.getTime() + data.durationMinutes * 60_000,
      );
    }

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
    options?: { staffUserId?: string; storeView?: boolean },
  ) {
    const conditions: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];

    if (options?.staffUserId) {
      // Viewing a specific staff member's calendar
      conditions.push(eq(appointments.staffUserId, options.staffUserId));
    } else if (options?.storeView && user.role !== "ba") {
      // Store view: manager+ sees all staff in their store scope
      const scope = await this.scopeService.scopeByStore(user, appointments.storeId);
      if (scope) conditions.push(scope);
    } else if (user.role === "ba") {
      conditions.push(eq(appointments.staffUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(user, appointments.storeId);
      if (scope) conditions.push(scope);
    }

    const rows = await this.db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        durationMinutes: appointments.durationMinutes,
        serviceTypeId: appointments.serviceTypeId,
        serviceTypeName: serviceTypes.displayName,
        serviceTypeColor: serviceTypes.color,
        status: appointments.status,
        notes: appointments.notes,
        isVirtual: appointments.isVirtual,
        customerId: appointments.customerId,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        customerPhone: customers.phone,
        customerLifecycleStage: customers.lifecycleStage,
        staffUserId: appointments.staffUserId,
        staffName: users.fullName,
        storeId: appointments.storeId,
        storeName: stores.displayName,
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(users, eq(appointments.staffUserId, users.id))
      .leftJoin(stores, eq(appointments.storeId, stores.id))
      .leftJoin(serviceTypes, eq(appointments.serviceTypeId, serviceTypes.id))
      .where(and(...conditions))
      .orderBy(appointments.startTime);

    return rows;
  }

  /**
   * Resolve the staff member's store and hours, plus all of their blocking
   * appointments inside a date range, in a single roundtrip. Reused by both
   * availability endpoints — avoids divergent slot logic between the calendar
   * dots view and the per-day slot picker.
   */
  private async loadAvailabilityContext(
    staffUserId: string,
    requester: SessionUser,
    from: Date,
    to: Date,
  ) {
    // Authorization: BA can only check their own calendar. Manager/supervisor
    // checking a BA must share store scope. Admin sees everyone.
    if (requester.role === "ba" && requester.id !== staffUserId) {
      throw new BadRequestException(
        "BAs can only check their own availability",
      );
    }

    const [staff] = await this.db
      .select({
        id: users.id,
        storeId: users.storeId,
      })
      .from(users)
      .where(eq(users.id, staffUserId));
    if (!staff) throw new NotFoundException("Staff member not found");
    if (!staff.storeId) {
      throw new BadRequestException("Staff member has no store assigned");
    }

    if (requester.role !== "admin") {
      const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(
        requester,
      );
      if (!accessibleStoreIds.includes(staff.storeId)) {
        throw new BadRequestException(
          "You cannot view availability for this staff member's store",
        );
      }
    }

    const [store] = await this.db
      .select({ id: stores.id, hours: stores.hours })
      .from(stores)
      .where(eq(stores.id, staff.storeId));

    const busy = await this.db
      .select({
        startTime: appointments.startTime,
        durationMinutes: appointments.durationMinutes,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.staffUserId, staffUserId),
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
          inArray(appointments.status, BLOCKING_STATUSES),
        ),
      );

    return { store, busy };
  }

  /**
   * Enumerate slot start times for a single calendar day, respecting:
   *   - the store's opening hours for that day-of-week
   *   - the requested service duration (last slot must END by close)
   *   - the 30-min grid
   *   - already-booked appointments (subtract overlaps)
   *   - "no slots in the past" rule
   *
   * `now` is injected so tests can pin time without monkey-patching Date.
   */
  private buildDaySlots(
    day: Date,
    storeHours: { store?: Record<string, string> } | null | undefined,
    busy: { startTime: Date; durationMinutes: number }[],
    durationMinutes: number,
    now: Date,
  ): { startsAt: Date; endsAt: Date }[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    const hours = resolveDayHours(storeHours, dayStart.getDay());
    const openMin = hours?.open ?? FALLBACK_OPEN_MINUTES;
    const closeMin = hours?.close ?? FALLBACK_CLOSE_MINUTES;

    // If the store explicitly closed this day (we got `null` *and* there's no
    // fallback we want to use), skip. For now `null` falls back to wide hours
    // so the BA can still book — change here if "closed = no slots".
    if (hours === null && !storeHours?.store) {
      // unknown schedule → wide fallback
    } else if (hours === null) {
      return [];
    }

    const slots: { startsAt: Date; endsAt: Date }[] = [];
    for (let m = openMin; m + durationMinutes <= closeMin; m += SLOT_GRID_MINUTES) {
      const startsAt = new Date(dayStart);
      startsAt.setMinutes(m);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

      if (startsAt.getTime() <= now.getTime()) continue;

      const overlaps = busy.some((b) => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = bStart + b.durationMinutes * 60_000;
        return startsAt.getTime() < bEnd && endsAt.getTime() > bStart;
      });
      if (overlaps) continue;

      slots.push({ startsAt, endsAt });
    }
    return slots;
  }

  /**
   * Calendar dots: which days in [from, to] have ≥ 1 open slot for the
   * requested service duration. Used by the AvailabilityCalendar to render
   * "•" markers under each day.
   */
  async getAvailabilityDays(
    requester: SessionUser,
    params: { staffUserId: string; from: Date; to: Date; durationMinutes: number },
  ) {
    const { store, busy } = await this.loadAvailabilityContext(
      params.staffUserId,
      requester,
      params.from,
      params.to,
    );

    const now = new Date();
    const days: { date: string; hasAvailability: boolean }[] = [];

    const cursor = new Date(params.from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(params.to);
    end.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= end.getTime()) {
      const slots = this.buildDaySlots(
        cursor,
        store?.hours ?? null,
        busy,
        params.durationMinutes,
        now,
      );
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      days.push({
        date: `${yyyy}-${mm}-${dd}`,
        hasAvailability: slots.length > 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  /**
   * Per-day slot list. Returns every viable start time as ISO instants — the
   * UI just renders them; the spec calls for booked slots to be omitted, not
   * greyed out, so this endpoint never emits `available: false`.
   */
  async getAvailabilitySlots(
    requester: SessionUser,
    params: { staffUserId: string; date: Date; durationMinutes: number },
  ) {
    const dayStart = new Date(params.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const { store, busy } = await this.loadAvailabilityContext(
      params.staffUserId,
      requester,
      dayStart,
      dayEnd,
    );

    const now = new Date();
    const slots = this.buildDaySlots(
      dayStart,
      store?.hours ?? null,
      busy,
      params.durationMinutes,
      now,
    );

    return slots.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      available: true,
    }));
  }
}

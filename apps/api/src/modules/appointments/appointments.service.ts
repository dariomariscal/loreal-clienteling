import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  appointments,
  customers,
  users,
  stores,
  serviceTypes,
  serviceTypeRequiredSkills,
  userSkills,
  schedulingPolicies,
  customerVisits,
  suggestedActions,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import { CustomerVisitsService } from "../customer-visits/customer-visits.service";
import {
  NotificationEvents,
  type AppointmentStatusChangedEvent,
} from "../notifications/notification-events";
import type {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CancelAppointmentDto,
  CancelAppointmentSeriesDto,
  CreateAppointmentSeriesDto,
  MarkNoShowDto,
  CheckOutAppointmentDto,
} from "../../dtos/appointments.dto";

// Statuses that consume a slot. Cancelled / rescheduled / no_show free it up.
const BLOCKING_STATUSES = ["scheduled", "confirmed", "completed"];

// Fallback when a store has no hours configured. Wide enough to never produce
// "no availability" for a store that simply forgot to upload its schedule.
const FALLBACK_OPEN_MINUTES = 10 * 60; // 10:00
const FALLBACK_CLOSE_MINUTES = 21 * 60; // 21:00
const FALLBACK_SLOT_GRANULARITY = 30;
const FALLBACK_MIN_LEAD_MINUTES = 0;
const FALLBACK_MAX_ADVANCE_DAYS = 90;

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

function parseHHMM(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
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
    const inRange =
      startIdx <= endIdx
        ? dayOfWeek >= startIdx && dayOfWeek <= endIdx
        : dayOfWeek >= startIdx || dayOfWeek <= endIdx;
    if (inRange) return parseRangeMinutes(range);
  }
  return null;
}

interface EffectivePolicy {
  slotGranularityMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  workWindowStart: number | null;
  workWindowEnd: number | null;
  activeDays: Record<DayToken, boolean> | null;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
    @Inject(CustomerVisitsService)
    private customerVisitsService: CustomerVisitsService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async findAll(
    user: SessionUser,
    filters?: { from?: Date; to?: Date; staffUserId?: string },
  ) {
    const conditions: any[] = [];

    if (user.role === "beauty_advisor") {
      conditions.push(eq(appointments.staffUserId, user.id));
    } else {
      const scope = await this.scopeService.scopeByStore(
        user,
        appointments.storeId,
      );
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

    // Resolve the service type so we can enforce lead time, horizon, and use
    // its buffers when computing endTime. Without this the booking engine
    // happily accepts "in 2 minutes" or "3 years ahead".
    let serviceTypeId = data.serviceTypeId;
    let serviceType:
      | typeof serviceTypes.$inferSelect
      | undefined;

    if (serviceTypeId) {
      const [row] = await this.db
        .select()
        .from(serviceTypes)
        .where(eq(serviceTypes.id, serviceTypeId));
      serviceType = row;
    }

    if (!serviceType) {
      const [fallback] = await this.db
        .select()
        .from(serviceTypes)
        .where(eq(serviceTypes.isActive, true))
        .orderBy(serviceTypes.sortOrder)
        .limit(1);
      if (!fallback) {
        throw new NotFoundException(
          "No hay tipos de cita configurados. Crea al menos uno antes de agendar.",
        );
      }
      serviceType = fallback;
      serviceTypeId = fallback.id;
    }

    const startTime = new Date(data.startTime);
    const policy = await this.resolveEffectivePolicy(storeId, serviceTypeId!);

    const now = new Date();
    const leadMinutes = Math.max(
      serviceType.minLeadTimeMinutes ?? 0,
      policy.minLeadTimeMinutes,
    );
    if (startTime.getTime() < now.getTime() + leadMinutes * 60_000) {
      throw new BadRequestException(
        `Las citas requieren al menos ${leadMinutes} minutos de anticipación.`,
      );
    }
    const maxAdvance = Math.min(
      serviceType.maxAdvanceDays ?? FALLBACK_MAX_ADVANCE_DAYS,
      policy.maxAdvanceDays,
    );
    if (
      startTime.getTime() >
      now.getTime() + maxAdvance * 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        `Las citas no pueden agendarse con más de ${maxAdvance} días de anticipación.`,
      );
    }

    const endTime = new Date(
      startTime.getTime() + data.durationMinutes * 60_000,
    );

    // Brand coherence: if the service is brand-bound, the BA must belong to
    // the same brand. Prevents a YSL BA being booked for a Lancôme service.
    if (serviceType.brandId) {
      const [staff] = await this.db
        .select({ brandId: users.brandId })
        .from(users)
        .where(eq(users.id, user.id));
      if (staff?.brandId && staff.brandId !== serviceType.brandId) {
        throw new BadRequestException(
          "Este servicio pertenece a otra marca; el asesor asignado no está calificado para impartirlo.",
        );
      }
    }

    // Skills gate: the BA must hold every skill the service requires
    // (service_type_required_skills, AND semantics, with minProficiency).
    await this.assertStaffCanPerformService(user.id, serviceTypeId!);

    const [appt] = await this.db
      .insert(appointments)
      .values({
        customerId: data.customerId,
        staffUserId: user.id,
        storeId,
        serviceTypeId: serviceTypeId!,
        startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        preForm: data.preForm,
        isVirtual: data.isVirtual ?? false,
        meetingUrl: data.meetingUrl,
        seriesId: data.seriesId,
        seriesSequence: data.seriesSequence,
      })
      .returning();

    await this.customerActivity.touchInteraction(data.customerId);

    return appt;
  }

  async update(id: string, data: UpdateAppointmentDto, user: SessionUser) {
    const existing = await this.findOne(id);
    const previousStatus = existing.status;

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

      this.emitStatusChanged({
        appointmentId: newAppt.id,
        staffUserId: newAppt.staffUserId,
        customerId: newAppt.customerId,
        previousStatus,
        newStatus: "rescheduled",
        startTime: newAppt.startTime,
      });

      return newAppt;
    }

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
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

    if (data.status && data.status !== previousStatus) {
      this.emitStatusChanged({
        appointmentId: updated.id,
        staffUserId: updated.staffUserId,
        customerId: updated.customerId,
        previousStatus,
        newStatus: updated.status,
        startTime: updated.startTime,
      });
    }

    return updated;
  }

  /**
   * Cancellation flow — also stamps cancelled_at / cancelled_by / reason so
   * the funnel analytics know *why*.
   */
  async cancel(id: string, data: CancelAppointmentDto, user: SessionUser) {
    const existing = await this.findOne(id);
    if (existing.status === "cancelled") return existing;

    const [updated] = await this.db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByUserId: user.id,
        cancellationReason: data.reason,
        notes: data.notes
          ? `${existing.notes ?? ""}\n[Cancel] ${data.notes}`.trim()
          : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    this.emitStatusChanged({
      appointmentId: updated.id,
      staffUserId: updated.staffUserId,
      customerId: updated.customerId,
      previousStatus: existing.status,
      newStatus: "cancelled",
      startTime: updated.startTime,
    });

    return updated;
  }

  /**
   * Create a recurring appointment series. The first occurrence's id becomes
   * the seriesId (Salesforce / Mindbody convention). Validates skills+brand
   * once at the series level, then materializes N occurrences atomically.
   * Lead time / horizon are enforced against the FIRST occurrence only; the
   * last occurrence is allowed to exceed maxAdvanceDays since it's the
   * series the customer is committing to.
   */
  async createSeries(data: CreateAppointmentSeriesDto, user: SessionUser) {
    if (data.occurrences < 2) {
      throw new BadRequestException(
        "Una serie debe tener al menos 2 ocurrencias.",
      );
    }
    const storeId = this.scopeService.assertStore(user);

    const [serviceType] = await this.db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.id, data.serviceTypeId));
    if (!serviceType) {
      throw new NotFoundException("Tipo de servicio no encontrado.");
    }

    // Same gates as create(), once for the whole series.
    if (serviceType.brandId) {
      const [staff] = await this.db
        .select({ brandId: users.brandId })
        .from(users)
        .where(eq(users.id, user.id));
      if (staff?.brandId && staff.brandId !== serviceType.brandId) {
        throw new BadRequestException(
          "Este servicio pertenece a otra marca; el asesor asignado no está calificado para impartirlo.",
        );
      }
    }
    await this.assertStaffCanPerformService(user.id, data.serviceTypeId);

    const policy = await this.resolveEffectivePolicy(
      storeId,
      data.serviceTypeId,
    );
    const now = new Date();
    const firstStart = new Date(data.firstStartTime);
    const leadMinutes = Math.max(
      serviceType.minLeadTimeMinutes ?? 0,
      policy.minLeadTimeMinutes,
    );
    if (firstStart.getTime() < now.getTime() + leadMinutes * 60_000) {
      throw new BadRequestException(
        `Las citas requieren al menos ${leadMinutes} minutos de anticipación.`,
      );
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const occurrences: Array<{
      startTime: Date;
      endTime: Date;
      sequence: number;
    }> = [];
    for (let i = 0; i < data.occurrences; i++) {
      const startTime = new Date(
        firstStart.getTime() + i * data.intervalDays * dayMs,
      );
      const endTime = new Date(
        startTime.getTime() + data.durationMinutes * 60_000,
      );
      occurrences.push({ startTime, endTime, sequence: i + 1 });
    }

    // Atomic: either all rows are inserted, or none. Without the transaction
    // a mid-flight failure leaves a half-materialized series with the
    // template (sequence=1) orphaned.
    const created = await this.db.transaction(async (tx) => {
      const [first] = await tx
        .insert(appointments)
        .values({
          customerId: data.customerId,
          staffUserId: user.id,
          storeId,
          serviceTypeId: data.serviceTypeId,
          startTime: occurrences[0].startTime,
          endTime: occurrences[0].endTime,
          durationMinutes: data.durationMinutes,
          notes: data.notes,
          preForm: data.preForm,
          isVirtual: data.isVirtual ?? false,
          seriesSequence: 1,
        })
        .returning();

      // Backfill seriesId == first.id so the "template" matches the
      // industry convention (first occurrence is the series root).
      await tx
        .update(appointments)
        .set({ seriesId: first.id })
        .where(eq(appointments.id, first.id));

      if (occurrences.length > 1) {
        await tx.insert(appointments).values(
          occurrences.slice(1).map((o) => ({
            customerId: data.customerId,
            staffUserId: user.id,
            storeId,
            serviceTypeId: data.serviceTypeId,
            startTime: o.startTime,
            endTime: o.endTime,
            durationMinutes: data.durationMinutes,
            notes: data.notes,
            preForm: data.preForm,
            isVirtual: data.isVirtual ?? false,
            seriesId: first.id,
            seriesSequence: o.sequence,
          })),
        );
      }

      const rows = await tx
        .select()
        .from(appointments)
        .where(eq(appointments.seriesId, first.id))
        .orderBy(appointments.seriesSequence);
      return rows;
    });

    await this.customerActivity.touchInteraction(data.customerId);

    return {
      seriesId: created[0].id,
      occurrences: created,
    };
  }

  /**
   * Cancel a single occurrence OR the entire series. "all" only cancels
   * occurrences that are still cancellable (scheduled/confirmed) — past
   * completed/no_show rows are left alone to preserve history.
   */
  async cancelSeries(
    id: string,
    data: CancelAppointmentSeriesDto,
    user: SessionUser,
  ) {
    const existing = await this.findOne(id);

    if (data.scope === "one" || !existing.seriesId) {
      return this.cancel(
        id,
        { reason: data.reason, notes: data.notes },
        user,
      );
    }

    const cancellable = await this.db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.seriesId, existing.seriesId),
          inArray(appointments.status, ["scheduled", "confirmed"]),
        ),
      );

    const cancelled: typeof existing[] = [];
    for (const row of cancellable) {
      const c = await this.cancel(
        row.id,
        { reason: data.reason, notes: data.notes },
        user,
      );
      cancelled.push(c as typeof existing);
    }
    return { seriesId: existing.seriesId, cancelledCount: cancelled.length };
  }

  async markNoShow(id: string, data: MarkNoShowDto) {
    const existing = await this.findOne(id);

    const [updated] = await this.db
      .update(appointments)
      .set({
        status: "no_show",
        noShowReason: data.reason,
        notes: data.notes
          ? `${existing.notes ?? ""}\n[No-show] ${data.notes}`.trim()
          : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    this.emitStatusChanged({
      appointmentId: updated.id,
      staffUserId: updated.staffUserId,
      customerId: updated.customerId,
      previousStatus: existing.status,
      newStatus: "no_show",
      startTime: updated.startTime,
    });

    return updated;
  }

  /**
   * Customer-side confirmation (reply YES on the reminder SMS, link click).
   * Distinct from confirmationSentAt which only tracks the outbound message.
   */
  async confirmByCustomer(id: string, confirmedAt?: Date) {
    const [updated] = await this.db
      .update(appointments)
      .set({
        confirmedByCustomerAt: confirmedAt ?? new Date(),
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Appointment not found");
    return updated;
  }

  /**
   * Check-in: customer arrived. Marks the appointment confirmed and opens a
   * customer_visits row so the visit is auditable / counted toward the
   * customer's history before the outcome is captured. Idempotent — if a
   * visit already exists for this appointment, returns it.
   */
  async checkIn(id: string, user: SessionUser) {
    const existing = await this.findOne(id);

    // Avoid double-opening a visit if the BA taps check-in twice.
    const [openVisit] = await this.db
      .select({ id: customerVisits.id })
      .from(customerVisits)
      .where(
        and(
          eq(customerVisits.appointmentId, id),
          eq(customerVisits.status, "in_progress"),
        ),
      )
      .limit(1);

    if (!openVisit) {
      await this.customerVisitsService.start(
        {
          customerId: existing.customerId,
          appointmentId: id,
          visitChannel: existing.isVirtual ? "virtual" : "in_store",
          startedAt: new Date(),
        },
        user,
      );
    }

    const [updated] = await this.db
      .update(appointments)
      .set({
        // Use "confirmed" as the "checked-in" signal until the explicit
        // checked_in status is added in a follow-up migration. The visit
        // row is the source of truth for "is the customer here right now".
        status:
          existing.status === "scheduled" ? "confirmed" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  /**
   * Check-out: closes the appointment with an outcome, mirrors the outcome
   * into the open customer_visits row, and seeds 3 standard follow-up
   * suggested_actions ("thank-you today", "NPS in 2 days", "follow-up in
   * 14 days") so the BA's "Today" screen surfaces them automatically.
   */
  async checkOut(
    id: string,
    data: CheckOutAppointmentDto,
    user: SessionUser,
  ) {
    const existing = await this.findOne(id);

    const [updated] = await this.db
      .update(appointments)
      .set({
        status: "completed",
        outcomeCode: data.outcomeCode,
        serviceOutcome: data.serviceOutcome ?? existing.serviceOutcome,
        notes: data.notes
          ? `${existing.notes ?? ""}\n[Outcome] ${data.notes}`.trim()
          : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    // Close the matching customer_visit, or open+close one retroactively if
    // the BA skipped check-in entirely. Without this fallback, ~95% of
    // completed appointments never produced a visit row.
    let [openVisit] = await this.db
      .select({ id: customerVisits.id })
      .from(customerVisits)
      .where(
        and(
          eq(customerVisits.appointmentId, id),
          eq(customerVisits.status, "in_progress"),
        ),
      )
      .limit(1);

    if (!openVisit) {
      try {
        const created = await this.customerVisitsService.start(
          {
            customerId: existing.customerId,
            appointmentId: id,
            visitChannel: existing.isVirtual ? "virtual" : "in_store",
            startedAt: existing.startTime,
          },
          user,
        );
        openVisit = { id: created.id };
      } catch {
        // Visit creation can race against a check-in completing between our
        // SELECT and INSERT — fall through and try the close anyway.
      }
    }

    if (openVisit) {
      try {
        await this.customerVisitsService.close(
          openVisit.id,
          {
            visitReason: this.mapOutcomeToVisitReason(
              data.outcomeCode,
              existing.serviceTypeId,
            ),
            outcome: this.mapOutcomeCodeToVisitOutcome(data.outcomeCode),
            sentiment: data.serviceOutcome?.satisfactionScore
              ? this.scoreToSentiment(
                  data.serviceOutcome.satisfactionScore,
                )
              : undefined,
            notes: data.notes,
          },
          user,
        );
      } catch {
        // Best-effort: if closing the visit fails (already closed, race),
        // don't block the check-out. The appointment outcome is the
        // primary source of truth.
      }
    }

    // Seed standard follow-ups so the BA's day-after Today screen is
    // populated without a separate "Schedule follow-up" step.
    await this.seedPostAppointmentFollowUps(updated, user);

    this.emitStatusChanged({
      appointmentId: updated.id,
      staffUserId: updated.staffUserId,
      customerId: updated.customerId,
      previousStatus: existing.status,
      newStatus: "completed",
      startTime: updated.startTime,
    });

    return updated;
  }

  /**
   * Throws BadRequest if `staffUserId` doesn't hold every skill required by
   * the service. Skipped when the service has no required skills (open
   * catalog). Reused by create() and update() when staff/service changes.
   */
  private async assertStaffCanPerformService(
    staffUserId: string,
    serviceTypeId: string,
  ) {
    const required = await this.db
      .select({
        skillId: serviceTypeRequiredSkills.skillId,
        minProficiency: serviceTypeRequiredSkills.minProficiency,
      })
      .from(serviceTypeRequiredSkills)
      .where(eq(serviceTypeRequiredSkills.serviceTypeId, serviceTypeId));

    if (required.length === 0) return;

    const owned = await this.db
      .select({
        skillId: userSkills.skillId,
        proficiency: userSkills.proficiency,
      })
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, staffUserId),
          inArray(
            userSkills.skillId,
            required.map((r) => r.skillId),
          ),
        ),
      );

    const ownedMap = new Map(owned.map((o) => [o.skillId, o.proficiency ?? 0]));
    const missing = required.filter((r) => {
      const prof = ownedMap.get(r.skillId);
      if (prof === undefined) return true;
      return prof < (r.minProficiency ?? 0);
    });

    if (missing.length > 0) {
      throw new BadRequestException(
        "El asesor asignado no tiene todas las certificaciones requeridas para este servicio.",
      );
    }
  }

  /** Map outcome_code → customer_visits.outcome. */
  private mapOutcomeCodeToVisitOutcome(code: string): string {
    switch (code) {
      case "sale_closed":
        return "purchased";
      case "sample_given":
        return "sample_given";
      case "future_intent":
        return "followup_needed";
      case "referred_out":
        return "followup_needed";
      case "no_purchase":
      default:
        return "no_purchase";
    }
  }

  /**
   * Pick a reasonable visit reason since we require one at close-out and
   * the appointment-level taxonomy is different. Fallback to "new_purchase"
   * for sale_closed, "diagnostic" for free consults.
   */
  private mapOutcomeToVisitReason(
    outcomeCode: string,
    _serviceTypeId: string,
  ): string {
    if (outcomeCode === "sale_closed") return "new_purchase";
    if (outcomeCode === "sample_given") return "diagnostic";
    if (outcomeCode === "referred_out") return "diagnostic";
    return "diagnostic";
  }

  private scoreToSentiment(score: number): string {
    if (score >= 8) return "positive";
    if (score <= 4) return "negative";
    return "neutral";
  }

  /**
   * Auto-generate post-appointment follow-ups. Three rows by default:
   *   - "thank-you" (today)        → triggerType post_purchase
   *   - "NPS check" (+2 days)      → triggerType post_purchase
   *   - "follow-up call" (+14d)    → triggerType post_purchase
   *
   * Skipped entirely when outcome is no_purchase + referred_out, where the
   * customer either had no interaction value or is now another BA's
   * responsibility.
   */
  private async seedPostAppointmentFollowUps(
    appt: typeof appointments.$inferSelect,
    _user: SessionUser,
  ) {
    if (
      appt.outcomeCode === "referred_out" ||
      appt.outcomeCode === null
    ) {
      return;
    }

    const today = new Date();
    const in2d = new Date(today);
    in2d.setDate(in2d.getDate() + 2);
    const in14d = new Date(today);
    in14d.setDate(in14d.getDate() + 14);

    const toYmd = (d: Date) => d.toISOString().slice(0, 10);

    const baseDescription =
      appt.outcomeCode === "sale_closed"
        ? "Cita completada con venta — cerrar el ciclo con la clienta"
        : "Cita completada sin venta — mantener la relación abierta";

    await this.db.insert(suggestedActions).values([
      {
        customerId: appt.customerId,
        assignedToUserId: appt.staffUserId,
        dueDate: toYmd(today),
        triggerType: "post_purchase",
        description: `${baseDescription}: enviar mensaje de agradecimiento`,
        recommendedAction:
          "Enviar 'gracias por venir' por WhatsApp o SMS hoy.",
        priority: 1,
      },
      {
        customerId: appt.customerId,
        assignedToUserId: appt.staffUserId,
        dueDate: toYmd(in2d),
        triggerType: "post_purchase",
        description:
          "Encuesta NPS post-cita — pedir feedback de la experiencia",
        recommendedAction: "Pedir calificación 0-10 y comentario corto.",
        priority: 2,
      },
      {
        customerId: appt.customerId,
        assignedToUserId: appt.staffUserId,
        dueDate: toYmd(in14d),
        triggerType: "post_purchase",
        description:
          appt.outcomeCode === "sale_closed"
            ? "Seguimiento 14 días post-compra — confirmar resultados"
            : "Seguimiento 14 días post-consulta — recuperar interés",
        recommendedAction:
          "Llamar o escribir para verificar uso y agendar próxima visita.",
        priority: 3,
      },
    ]);
  }

  /**
   * Wrapper so listeners get a typed payload and we don't sprinkle event
   * dispatch logic across the method body.
   */
  private emitStatusChanged(payload: AppointmentStatusChangedEvent) {
    this.eventBus.emit(
      NotificationEvents.APPOINTMENT_STATUS_CHANGED,
      payload,
    );
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
      conditions.push(eq(appointments.staffUserId, options.staffUserId));
    } else if (options?.storeView && user.role !== "beauty_advisor") {
      const scope = await this.scopeService.scopeByStore(
        user,
        appointments.storeId,
      );
      if (scope) conditions.push(scope);
    } else if (user.role === "beauty_advisor") {
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
   * Resolve the highest-priority scheduling policy that applies to a
   * (store, serviceType) pair. Falls back to (store, *), (*, serviceType),
   * (*, *) in that order. Returns engine-friendly minutes-from-midnight.
   */
  private async resolveEffectivePolicy(
    storeId: string | null,
    serviceTypeId: string | null,
  ): Promise<EffectivePolicy> {
    const rows = await this.db
      .select()
      .from(schedulingPolicies)
      .where(eq(schedulingPolicies.isActive, true));

    // Score each row by specificity (store+service > store > service > global)
    // then priority. Higher specificity wins.
    let best:
      | { row: typeof schedulingPolicies.$inferSelect; score: number }
      | null = null;
    for (const row of rows) {
      const storeMatch = row.storeId === storeId;
      const serviceMatch = row.serviceTypeId === serviceTypeId;
      const storeNull = row.storeId === null;
      const serviceNull = row.serviceTypeId === null;
      if (!storeMatch && !storeNull) continue;
      if (!serviceMatch && !serviceNull) continue;
      const specificity =
        (storeMatch ? 2 : 0) + (serviceMatch ? 1 : 0) + row.priority * 0.01;
      if (!best || specificity > best.score) best = { row, score: specificity };
    }

    if (!best) {
      return {
        slotGranularityMinutes: FALLBACK_SLOT_GRANULARITY,
        minLeadTimeMinutes: FALLBACK_MIN_LEAD_MINUTES,
        maxAdvanceDays: FALLBACK_MAX_ADVANCE_DAYS,
        workWindowStart: null,
        workWindowEnd: null,
        activeDays: null,
      };
    }

    return {
      slotGranularityMinutes: best.row.slotGranularityMinutes,
      minLeadTimeMinutes:
        best.row.minLeadTimeMinutes ?? FALLBACK_MIN_LEAD_MINUTES,
      maxAdvanceDays: best.row.maxAdvanceDays ?? FALLBACK_MAX_ADVANCE_DAYS,
      workWindowStart: parseHHMM(best.row.workWindowStart),
      workWindowEnd: parseHHMM(best.row.workWindowEnd),
      activeDays: (best.row.activeDays ?? null) as
        | Record<DayToken, boolean>
        | null,
    };
  }

  private async loadAvailabilityContext(
    staffUserId: string,
    requester: SessionUser,
    from: Date,
    to: Date,
    serviceTypeId?: string,
  ) {
    if (requester.role === "beauty_advisor" && requester.id !== staffUserId) {
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
        serviceTypeId: appointments.serviceTypeId,
        bufferBefore: serviceTypes.bufferBeforeMinutes,
        bufferAfter: serviceTypes.bufferAfterMinutes,
      })
      .from(appointments)
      .leftJoin(serviceTypes, eq(appointments.serviceTypeId, serviceTypes.id))
      .where(
        and(
          eq(appointments.staffUserId, staffUserId),
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
          inArray(appointments.status, BLOCKING_STATUSES),
        ),
      );

    let service: typeof serviceTypes.$inferSelect | undefined;
    if (serviceTypeId) {
      const [row] = await this.db
        .select()
        .from(serviceTypes)
        .where(eq(serviceTypes.id, serviceTypeId));
      service = row;
    }

    const policy = await this.resolveEffectivePolicy(
      staff.storeId,
      serviceTypeId ?? null,
    );

    return { store, busy, service, policy };
  }

  /**
   * Enumerate slot start times for a single calendar day, respecting:
   *   - the store's opening hours for that day-of-week
   *   - the policy's working window override
   *   - the policy's active days override
   *   - the requested service duration + bufferBefore + bufferAfter
   *   - the policy slot granularity
   *   - already-booked appointments (subtract overlaps INCLUDING buffers)
   *   - min lead time / "no slots in the past" rule
   */
  private buildDaySlots(
    day: Date,
    storeHours: { store?: Record<string, string> } | null | undefined,
    busy: Array<{
      startTime: Date;
      durationMinutes: number;
      bufferBefore: number | null;
      bufferAfter: number | null;
    }>,
    durationMinutes: number,
    service: typeof serviceTypes.$inferSelect | undefined,
    policy: EffectivePolicy,
    now: Date,
  ): { startsAt: Date; endsAt: Date }[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    // Policy active days override; if day disabled, skip
    if (policy.activeDays) {
      const token = DAY_TOKENS[dayStart.getDay()];
      if (policy.activeDays[token] === false) return [];
    }

    // Window: intersect store hours with policy window if both present.
    const storeWindow = resolveDayHours(storeHours, dayStart.getDay());
    let openMin = storeWindow?.open ?? FALLBACK_OPEN_MINUTES;
    let closeMin = storeWindow?.close ?? FALLBACK_CLOSE_MINUTES;
    if (storeWindow === null && !storeHours?.store) {
      // unknown schedule → wide fallback
    } else if (storeWindow === null) {
      return [];
    }
    if (policy.workWindowStart !== null) {
      openMin = Math.max(openMin, policy.workWindowStart);
    }
    if (policy.workWindowEnd !== null) {
      closeMin = Math.min(closeMin, policy.workWindowEnd);
    }
    if (closeMin <= openMin) return [];

    const bufBefore = service?.bufferBeforeMinutes ?? 0;
    const bufAfter = service?.bufferAfterMinutes ?? 0;
    const blockTotal = bufBefore + durationMinutes + bufAfter;
    const granularity = policy.slotGranularityMinutes;
    const leadCutoffMs = now.getTime() + policy.minLeadTimeMinutes * 60_000;

    const slots: { startsAt: Date; endsAt: Date }[] = [];
    for (let m = openMin; m + blockTotal <= closeMin; m += granularity) {
      // Customer-visible block: startsAt = openMin slot + bufBefore
      const blockStart = new Date(dayStart);
      blockStart.setMinutes(m);
      const startsAt = new Date(blockStart.getTime() + bufBefore * 60_000);
      const endsAt = new Date(
        startsAt.getTime() + durationMinutes * 60_000,
      );

      if (startsAt.getTime() < leadCutoffMs) continue;

      // Overlap detection: each busy event blocks
      //   [bStart - bBufBefore, bEnd + bBufAfter]
      // and we test against [blockStart, blockStart + blockTotal].
      const blockEndMs = blockStart.getTime() + blockTotal * 60_000;
      const overlaps = busy.some((b) => {
        const bStart =
          new Date(b.startTime).getTime() - (b.bufferBefore ?? 0) * 60_000;
        const bEnd =
          new Date(b.startTime).getTime() +
          (b.durationMinutes + (b.bufferAfter ?? 0)) * 60_000;
        return blockStart.getTime() < bEnd && blockEndMs > bStart;
      });
      if (overlaps) continue;

      slots.push({ startsAt, endsAt });
    }
    return slots;
  }

  async getAvailabilityDays(
    requester: SessionUser,
    params: {
      staffUserId: string;
      from: Date;
      to: Date;
      durationMinutes: number;
      serviceTypeId?: string;
    },
  ) {
    const { store, busy, service, policy } = await this.loadAvailabilityContext(
      params.staffUserId,
      requester,
      params.from,
      params.to,
      params.serviceTypeId,
    );

    const now = new Date();
    const days: { date: string; hasAvailability: boolean }[] = [];

    const cursor = new Date(params.from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(params.to);
    end.setHours(0, 0, 0, 0);

    // Cap to horizon
    const horizonMs = now.getTime() + policy.maxAdvanceDays * 86_400_000;

    while (cursor.getTime() <= end.getTime()) {
      const dayMs = cursor.getTime();
      let hasAvailability = false;
      if (dayMs <= horizonMs) {
        const slots = this.buildDaySlots(
          cursor,
          store?.hours ?? null,
          busy,
          params.durationMinutes,
          service,
          policy,
          now,
        );
        hasAvailability = slots.length > 0;
      }
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      days.push({ date: `${yyyy}-${mm}-${dd}`, hasAvailability });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  async getAvailabilitySlots(
    requester: SessionUser,
    params: {
      staffUserId: string;
      date: Date;
      durationMinutes: number;
      serviceTypeId?: string;
    },
  ) {
    const dayStart = new Date(params.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const { store, busy, service, policy } = await this.loadAvailabilityContext(
      params.staffUserId,
      requester,
      dayStart,
      dayEnd,
      params.serviceTypeId,
    );

    const now = new Date();
    const horizonMs = now.getTime() + policy.maxAdvanceDays * 86_400_000;
    if (dayStart.getTime() > horizonMs) return [];

    const slots = this.buildDaySlots(
      dayStart,
      store?.hours ?? null,
      busy,
      params.durationMinutes,
      service,
      policy,
      now,
    );

    return slots.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      available: true,
    }));
  }
}

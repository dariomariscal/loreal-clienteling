import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { schedulingPolicies } from "@loreal/database";
import type {
  CreateSchedulingPolicyDto,
  UpdateSchedulingPolicyDto,
} from "../../dtos/scheduling-policies.dto";

const FALLBACK = {
  slotGranularityMinutes: 30,
  minLeadTimeMinutes: 0,
  maxAdvanceDays: 90,
  activeDays: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: false,
  },
  workWindowStart: "10:00",
  workWindowEnd: "20:00",
  blackoutDates: [] as Array<{ from: string; to: string; reason?: string }>,
};

@Injectable()
export class SchedulingPoliciesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  findAll() {
    return this.db
      .select()
      .from(schedulingPolicies)
      .orderBy(asc(schedulingPolicies.priority));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select()
      .from(schedulingPolicies)
      .where(eq(schedulingPolicies.id, id));
    if (!row) throw new NotFoundException("Scheduling policy not found");
    return row;
  }

  async create(data: CreateSchedulingPolicyDto) {
    const [row] = await this.db
      .insert(schedulingPolicies)
      .values(data as typeof schedulingPolicies.$inferInsert)
      .returning();
    return row;
  }

  async update(id: string, data: UpdateSchedulingPolicyDto) {
    const [row] = await this.db
      .update(schedulingPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schedulingPolicies.id, id))
      .returning();
    if (!row) throw new NotFoundException("Scheduling policy not found");
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db
      .delete(schedulingPolicies)
      .where(eq(schedulingPolicies.id, id))
      .returning();
    if (!row) throw new NotFoundException("Scheduling policy not found");
    return row;
  }

  /**
   * Resolve the highest-specificity active policy for a (store, service)
   * pair and return engine-friendly merged values. Falls back to safe
   * defaults so the booking engine never receives null knobs.
   */
  async resolveEffective(params: {
    storeId: string | null;
    serviceTypeId: string | null;
  }) {
    const rows = await this.db
      .select()
      .from(schedulingPolicies)
      .where(eq(schedulingPolicies.isActive, true));

    let best:
      | { row: typeof schedulingPolicies.$inferSelect; score: number }
      | null = null;
    for (const row of rows) {
      const storeMatch = row.storeId === params.storeId;
      const serviceMatch = row.serviceTypeId === params.serviceTypeId;
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
        ...FALLBACK,
        sourcePolicyId: null as string | null,
      };
    }

    return {
      slotGranularityMinutes: best.row.slotGranularityMinutes,
      minLeadTimeMinutes:
        best.row.minLeadTimeMinutes ?? FALLBACK.minLeadTimeMinutes,
      maxAdvanceDays:
        best.row.maxAdvanceDays ?? FALLBACK.maxAdvanceDays,
      activeDays:
        (best.row.activeDays as typeof FALLBACK.activeDays | null) ??
        FALLBACK.activeDays,
      workWindowStart: best.row.workWindowStart ?? FALLBACK.workWindowStart,
      workWindowEnd: best.row.workWindowEnd ?? FALLBACK.workWindowEnd,
      blackoutDates:
        (best.row.blackoutDates as typeof FALLBACK.blackoutDates | null) ??
        FALLBACK.blackoutDates,
      sourcePolicyId: best.row.id,
    };
  }

}

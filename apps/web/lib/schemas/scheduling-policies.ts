import { z } from "zod";
import { SLOT_GRANULARITY_VALUES } from "@loreal/contracts";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const activeDaysSchema = z
  .object({
    mon: z.boolean().optional(),
    tue: z.boolean().optional(),
    wed: z.boolean().optional(),
    thu: z.boolean().optional(),
    fri: z.boolean().optional(),
    sat: z.boolean().optional(),
    sun: z.boolean().optional(),
  })
  .strict();

export const blackoutRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export const createSchedulingPolicySchema = z.object({
  storeId: z.string().uuid().nullable().optional(),
  serviceTypeId: z.string().uuid().nullable().optional(),
  slotGranularityMinutes: z.union([
    z.literal(SLOT_GRANULARITY_VALUES[0]),
    z.literal(SLOT_GRANULARITY_VALUES[1]),
    z.literal(SLOT_GRANULARITY_VALUES[2]),
  ]),
  minLeadTimeMinutes: z.number().int().min(0).optional(),
  maxAdvanceDays: z.number().int().positive().optional(),
  activeDays: activeDaysSchema.optional(),
  workWindowStart: z.string().regex(HHMM).optional(),
  workWindowEnd: z.string().regex(HHMM).optional(),
  blackoutDates: z.array(blackoutRangeSchema).optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const updateSchedulingPolicySchema =
  createSchedulingPolicySchema.partial();

export type CreateSchedulingPolicyInput = z.infer<
  typeof createSchedulingPolicySchema
>;
export type UpdateSchedulingPolicyInput = z.infer<
  typeof updateSchedulingPolicySchema
>;

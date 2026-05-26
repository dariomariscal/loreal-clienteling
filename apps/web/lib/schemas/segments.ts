import { z } from "zod";

export const LIFECYCLE_STAGES = [
  "new",
  "returning",
  "vip",
  "at_risk",
  "dormant",
] as const;

export const LOYALTY_TIERS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "vip",
] as const;

export const segmentFilterSchema = z.object({
  lifecycleStages: z.array(z.enum(LIFECYCLE_STAGES)).optional(),
  loyaltyTiers: z.array(z.enum(LOYALTY_TIERS)).optional(),
  daysSinceLastOrderMin: z.number().int().min(0).optional(),
  daysSinceLastOrderMax: z.number().int().min(0).optional(),
  totalSpentMin: z.number().min(0).optional(),
  ordersCountMin: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  assignedToMe: z.boolean().optional(),
  birthdayThisMonth: z.boolean().optional(),
});

export const SEGMENT_SCOPES = [
  "personal",
  "brand",
  "division",
  "global",
] as const;

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  filter: segmentFilterSchema,
  isDynamic: z.boolean().optional(),
  /**
   * personal = owned by the caller (default)
   * brand    = shared inside the caller's brand
   * division = shared across the caller's division (NRM / admin)
   * global   = admin-only
   */
  scope: z.enum(SEGMENT_SCOPES).optional(),
  /** Admin override when scope='brand'. Ignored for non-admin callers. */
  brandId: z.string().uuid().optional(),
  /** Admin override when scope='division'. Ignored for non-admin callers. */
  divisionId: z.string().uuid().optional(),
});

export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  filter: segmentFilterSchema.optional(),
});

export const previewSegmentSchema = z.object({
  filter: segmentFilterSchema,
});

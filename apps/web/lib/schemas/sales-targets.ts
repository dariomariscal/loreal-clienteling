import { z } from "zod";

export const TARGET_OWNER_TYPES = ["counter", "user", "store", "area"] as const;
export const TARGET_METRIC_KINDS = [
  "sales_amount",
  "sales_units",
  "appointments_booked",
  "appointments_completed",
  "follow_ups_completed",
  "new_customers",
  "samples_given",
  "visits",
] as const;
export const TARGET_PERIOD_KINDS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const createSalesTargetSchema = z.object({
  ownerType: z.enum(TARGET_OWNER_TYPES).optional(),
  storeId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  ownerUserId: z.string().optional(),
  metricKind: z.enum(TARGET_METRIC_KINDS).optional(),
  periodKind: z.enum(TARGET_PERIOD_KINDS),
  periodStart: isoDate,
  periodEnd: isoDate,
  targetValue: z.number().positive(),
  currency: z.string().max(3).optional(),
  parentTargetId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const updateSalesTargetSchema = z.object({
  targetValue: z.number().positive().optional(),
  currency: z.string().max(3).optional(),
  notes: z.string().max(500).optional(),
});

export const salesTargetFiltersSchema = z.object({
  ownerType: z.enum(TARGET_OWNER_TYPES).optional(),
  storeId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  ownerUserId: z.string().optional(),
  metricKind: z.enum(TARGET_METRIC_KINDS).optional(),
  periodKind: z.enum(TARGET_PERIOD_KINDS).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

import { z } from "zod";

export const SALES_TARGET_PERIODS = ["daily", "monthly"] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const createSalesTargetSchema = z.object({
  storeId: z.string().uuid(),
  brandId: z.string().uuid(),
  period: z.enum(SALES_TARGET_PERIODS),
  periodDate: isoDate,
  targetAmount: z.number().positive(),
  currency: z.string().max(3).optional(),
  notes: z.string().max(500).optional(),
});

export const updateSalesTargetSchema = z.object({
  targetAmount: z.number().positive().optional(),
  currency: z.string().max(3).optional(),
  notes: z.string().max(500).optional(),
});

export const salesTargetFiltersSchema = z.object({
  storeId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  period: z.enum(SALES_TARGET_PERIODS).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

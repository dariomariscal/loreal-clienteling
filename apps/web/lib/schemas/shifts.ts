import { z } from "zod";

export const SHIFT_STATUSES = [
  "scheduled",
  "active",
  "completed",
  "off",
  "vacation",
  "sick",
] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const createShiftSchema = z.object({
  userId: z.string(),
  storeId: z.string().uuid(),
  shiftDate: isoDate,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(SHIFT_STATUSES).optional(),
  notes: z.string().max(500).optional(),
});

export const updateShiftSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(SHIFT_STATUSES).optional(),
  notes: z.string().max(500).optional(),
});

export const shiftFiltersSchema = z.object({
  storeId: z.string().uuid().optional(),
  userId: z.string().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  status: z.enum(SHIFT_STATUSES).optional(),
});

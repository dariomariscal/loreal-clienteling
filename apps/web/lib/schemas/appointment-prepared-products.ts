import { z } from "zod";
import { PREPARED_PRODUCT_STATUSES } from "@loreal/contracts";

export const addPreparedProductSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  position: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
  status: z.enum(PREPARED_PRODUCT_STATUSES as [string, ...string[]]).optional(),
});

export const updatePreparedProductStatusSchema = z.object({
  status: z.enum(PREPARED_PRODUCT_STATUSES as [string, ...string[]]),
  note: z.string().max(500).optional(),
});

export type AddPreparedProductInput = z.infer<typeof addPreparedProductSchema>;
export type UpdatePreparedProductStatusInput = z.infer<
  typeof updatePreparedProductStatusSchema
>;

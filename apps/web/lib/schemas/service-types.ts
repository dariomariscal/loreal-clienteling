import { z } from "zod";

export const createServiceTypeSchema = z.object({
  code: z.string().min(1).max(30),
  displayName: z.string().min(1).max(200),
  durationMinutes: z.number().int().positive().optional(),
  bufferBeforeMinutes: z.number().int().min(0).optional(),
  bufferAfterMinutes: z.number().int().min(0).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Price must be a decimal string")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex code")
    .optional(),
  description: z.string().max(1000).optional(),
  brandId: z.string().uuid().optional(),
  maxCapacity: z.number().int().positive().optional(),
  requiresConfirmation: z.boolean().optional(),
  minLeadTimeMinutes: z.number().int().min(0).optional(),
  maxAdvanceDays: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateServiceTypeSchema = createServiceTypeSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>;

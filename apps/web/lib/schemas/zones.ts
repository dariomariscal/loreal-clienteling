import { z } from "zod";

export const createZoneSchema = z.object({
  code: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hex de 6 dígitos")
    .optional(),
  icon: z.string().min(1).max(50).optional(),
  municipalityIds: z.array(z.string().length(5)).optional(),
});

export const updateZoneSchema = createZoneSchema.partial();

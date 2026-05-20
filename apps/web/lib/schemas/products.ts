import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@loreal/contracts";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  brandId: z.string().uuid(),
  category: z.enum(PRODUCT_CATEGORIES as [string, ...string[]]),
  subcategory: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive(),
  estimatedDurationDays: z.coerce.number().int().positive().optional(),
  images: z.array(z.string().url()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

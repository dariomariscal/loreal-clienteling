import { z } from "zod";
import { GENDERS, LIFECYCLE_STAGES } from "@loreal/contracts";

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  gender: z.enum(GENDERS as [string, ...string[]]).optional(),
  birthday: z.coerce.date().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const searchCustomerSchema = z.object({
  query: z.string().min(1).max(200),
  type: z.enum(["exact", "name", "semantic"]).optional().default("name"),
});

export const customerFiltersSchema = z.object({
  stage: z.enum(LIFECYCLE_STAGES as [string, ...string[]]).optional(),
  storeId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
});

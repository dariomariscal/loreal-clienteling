import { z } from "zod";
import { USER_ROLES } from "@loreal/contracts";

const baseUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  role: z.enum(USER_ROLES as [string, ...string[]]),
  storeId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
});

export const createUserSchema = baseUserSchema.superRefine((data, ctx) => {
  if (data.role === "supervisor") {
    if (!data.zoneId) {
      ctx.addIssue({ code: "custom", path: ["zoneId"], message: "Requerido para supervisor" });
    }
    if (!data.brandId) {
      ctx.addIssue({ code: "custom", path: ["brandId"], message: "Requerido para supervisor" });
    }
  }
  if ((data.role === "ba" || data.role === "manager") && !data.storeId) {
    ctx.addIssue({ code: "custom", path: ["storeId"], message: "Requerido para este rol" });
  }
});

export const updateUserSchema = baseUserSchema.partial().omit({ email: true });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

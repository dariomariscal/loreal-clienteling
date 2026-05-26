import { z } from "zod";
import { USER_ROLES, BEAUTY_ADVISOR_SPECIALTIES } from "@loreal/contracts";

const baseUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  role: z.enum(USER_ROLES as [string, ...string[]]),
  storeId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  divisionId: z.string().uuid().optional(),
  specialty: z
    .enum(BEAUTY_ADVISOR_SPECIALTIES as unknown as [string, ...string[]])
    .optional(),
});

export const createUserSchema = baseUserSchema.superRefine((data, ctx) => {
  if (data.role === "area_manager") {
    if (!data.zoneId) {
      ctx.addIssue({
        code: "custom",
        path: ["zoneId"],
        message: "Requerido para Gerente de Zona",
      });
    }
    if (!data.divisionId) {
      ctx.addIssue({
        code: "custom",
        path: ["divisionId"],
        message: "Requerido para Gerente de Zona",
      });
    }
  }
  if (data.role === "national_retail_manager" && !data.divisionId) {
    ctx.addIssue({
      code: "custom",
      path: ["divisionId"],
      message: "Requerido para Director Nacional de Retail",
    });
  }
  if (
    (data.role === "beauty_advisor" || data.role === "counter_manager") &&
    !data.storeId
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["storeId"],
      message: "Requerido para este rol",
    });
  }
});

export const updateUserSchema = baseUserSchema.partial().omit({ email: true });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

import { z } from "zod";
import { BRAND_TIERS } from "@loreal/contracts";

export const createBrandSchema = z.object({
  code: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  tier: z.enum(BRAND_TIERS as [string, ...string[]]),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export const updateBrandSchema = createBrandSchema.partial();

export const upsertBrandConfigSchema = z.object({
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  fontFamily: z.string().max(100).optional(),
  virtualTryonEnabled: z.boolean().optional(),
});

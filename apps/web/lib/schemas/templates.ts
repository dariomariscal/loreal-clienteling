import { z } from "zod";
import { COMMUNICATION_CHANNELS, CAMPAIGN_TYPES } from "@loreal/contracts";

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  brandId: z.string().uuid().optional(),
  channel: z.enum(COMMUNICATION_CHANNELS as [string, ...string[]]),
  campaignType: z.enum(CAMPAIGN_TYPES as [string, ...string[]]),
  body: z.string().min(1).max(5000),
});

export const updateTemplateSchema = createTemplateSchema.partial();

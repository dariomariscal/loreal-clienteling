import { z } from "zod";
import {
  CommunicationChannel,
  CampaignType,
} from "@loreal/contracts";

export const createMessageSchema = z.object({
  customerId: z.string().uuid(),
  channel: z.nativeEnum(CommunicationChannel),
  templateId: z.string().uuid().optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  campaignType: z.nativeEnum(CampaignType).optional(),
});

import { z } from "zod";
import {
  CommunicationChannel,
  FollowupType,
} from "@loreal/contracts";

/**
 * Form-level schema for creating an outbound communication. Mirrors the
 * shape of `CreateCommunication` from @loreal/contracts but only includes
 * the fields the BA fills in — direction/status/addresses are set by the
 * backend.
 */
export const createCommunicationSchema = z.object({
  customerId: z.string().uuid(),
  channel: z.nativeEnum(CommunicationChannel),
  templateId: z.string().uuid().optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  followupType: z.nativeEnum(FollowupType).optional(),
});

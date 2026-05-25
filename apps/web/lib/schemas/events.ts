import { z } from "zod";

export const EVENT_KINDS = [
  "masterclass",
  "launch",
  "vip_preview",
  "trunk_show",
  "discovery",
] as const;

export const EVENT_STATUSES = [
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;

export const RSVP_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "waitlist",
] as const;

export const createEventSchema = z.object({
  storeId: z.string().uuid(),
  brandId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  kind: z.enum(EVENT_KINDS),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number().int().positive().optional(),
  coverImageUrl: z.string().url().max(500).optional(),
});

export const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  coverImageUrl: z.string().url().max(500).optional(),
  status: z.enum(EVENT_STATUSES).optional(),
});

export const listEventsQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const updateRsvpSchema = z.object({
  rsvpStatus: z.enum(RSVP_STATUSES),
});

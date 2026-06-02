import { z } from "zod";
import {
  VISIT_CHANNELS,
  VISIT_REASONS,
  BOOKED_REASONS,
  VISIT_OUTCOMES,
  VISIT_SENTIMENTS,
} from "@loreal/contracts";

const visitProductViewSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
});

export const startVisitSchema = z.object({
  customerId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  visitChannel: z.enum(VISIT_CHANNELS as [string, ...string[]]).optional(),
  bookedReason: z.enum(BOOKED_REASONS as [string, ...string[]]).optional(),
  partySize: z.number().int().min(1).optional(),
  startedAt: z.coerce.date().optional(),
});

export const updateVisitSchema = z.object({
  visitChannel: z.enum(VISIT_CHANNELS as [string, ...string[]]).optional(),
  bookedReason: z.enum(BOOKED_REASONS as [string, ...string[]]).optional(),
  partySize: z.number().int().min(1).optional(),
  notes: z.string().max(2000).optional(),
  productsViewed: z.array(visitProductViewSchema).optional(),
});

export const closeVisitSchema = z.object({
  visitReason: z.enum(VISIT_REASONS as [string, ...string[]]),
  outcome: z.enum(VISIT_OUTCOMES as [string, ...string[]]),
  sentiment: z.enum(VISIT_SENTIMENTS as [string, ...string[]]).optional(),
  notes: z.string().max(2000).optional(),
  productsViewed: z.array(visitProductViewSchema).optional(),
  convertedOrderId: z.string().uuid().optional(),
  followUpDate: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
});

export const abandonVisitSchema = z.object({
  notes: z.string().max(1000).optional(),
});

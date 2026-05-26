import { z } from "zod";

export const BA_RATING_SOURCES = [
  "post_visit_survey",
  "whatsapp_survey",
  "manager_attested",
  "counter_kiosk",
] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const createBaRatingSchema = z.object({
  reviewedUserId: z.string(),
  customerId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  score: z.number().int().min(0).max(10),
  comment: z.string().max(1000).optional(),
  source: z.enum(BA_RATING_SOURCES),
});

export const baNpsFiltersSchema = z.object({
  storeId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

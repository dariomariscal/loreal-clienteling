import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@loreal/contracts";

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  eventTypeId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.number().int().positive().max(480),
  comments: z.string().max(1000).optional(),
  isVirtual: z.boolean().default(false),
  videoLink: z.string().url().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES as [string, ...string[]]).optional(),
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  comments: z.string().max(1000).optional(),
});

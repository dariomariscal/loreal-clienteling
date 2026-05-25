import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@loreal/contracts";

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  startTime: z.coerce.date(),
  durationMinutes: z.number().int().positive().max(480),
  notes: z.string().max(1000).optional(),
  isVirtual: z.boolean().default(false),
  meetingUrl: z.string().url().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES as [string, ...string[]]).optional(),
  startTime: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  notes: z.string().max(1000).optional(),
});

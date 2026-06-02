import { z } from "zod";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_OUTCOME_CODES,
  APPOINTMENT_CANCELLATION_REASONS,
  APPOINTMENT_NO_SHOW_REASONS,
} from "@loreal/contracts";

export const appointmentPreFormSchema = z.object({
  goals: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const appointmentServiceOutcomeSchema = z.object({
  productsUsed: z.array(z.string()).optional(),
  satisfactionScore: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(1000).optional(),
});

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  startTime: z.coerce.date(),
  durationMinutes: z.number().int().positive().max(480),
  notes: z.string().max(1000).optional(),
  isVirtual: z.boolean().default(false),
  meetingUrl: z.string().url().optional(),
  preForm: appointmentPreFormSchema.optional(),
  seriesId: z.string().uuid().optional(),
  seriesSequence: z.number().int().positive().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES as [string, ...string[]]).optional(),
  startTime: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  notes: z.string().max(1000).optional(),
  preForm: appointmentPreFormSchema.optional(),
  serviceOutcome: appointmentServiceOutcomeSchema.optional(),
  outcomeCode: z
    .enum(APPOINTMENT_OUTCOME_CODES as [string, ...string[]])
    .optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.enum(APPOINTMENT_CANCELLATION_REASONS as [string, ...string[]]),
  notes: z.string().max(500).optional(),
});

export const markNoShowSchema = z.object({
  reason: z.enum(APPOINTMENT_NO_SHOW_REASONS as [string, ...string[]]),
  notes: z.string().max(500).optional(),
});

export const confirmAppointmentByCustomerSchema = z.object({
  confirmedAt: z.coerce.date().optional(),
});

export const checkOutAppointmentSchema = z.object({
  outcomeCode: z.enum(APPOINTMENT_OUTCOME_CODES as [string, ...string[]]),
  serviceOutcome: appointmentServiceOutcomeSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type MarkNoShowInput = z.infer<typeof markNoShowSchema>;
export type ConfirmAppointmentByCustomerInput = z.infer<
  typeof confirmAppointmentByCustomerSchema
>;
export type CheckOutAppointmentInput = z.infer<
  typeof checkOutAppointmentSchema
>;

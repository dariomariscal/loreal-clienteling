import { z } from "zod";

export const TASK_STATUSES = ["pending", "dismissed", "completed", "all"] as const;

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  dueOn: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  triggerType: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const snoozeTaskSchema = z.object({
  dueDate: z.string(),
});

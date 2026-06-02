import { z } from "zod";
import { SKILL_CATEGORIES } from "@loreal/contracts";

export const createSkillSchema = z.object({
  code: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  category: z.enum(SKILL_CATEGORIES as [string, ...string[]]),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSkillSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  category: z.enum(SKILL_CATEGORIES as [string, ...string[]]).optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const assignSkillToUserSchema = z.object({
  userId: z.string().min(1),
  skillId: z.string().uuid(),
  proficiency: z.number().int().min(1).max(5).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const assignSkillToServiceTypeSchema = z.object({
  serviceTypeId: z.string().uuid(),
  skillId: z.string().uuid(),
  minProficiency: z.number().int().min(1).max(5).optional(),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type AssignSkillToUserInput = z.infer<typeof assignSkillToUserSchema>;
export type AssignSkillToServiceTypeInput = z.infer<
  typeof assignSkillToServiceTypeSchema
>;

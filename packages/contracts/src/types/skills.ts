import type { SkillCategory } from "../enums/skills";

export interface Skill {
  id: string;
  code: string;
  displayName: string;
  category: SkillCategory;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
}

export interface CreateSkill {
  code: string;
  displayName: string;
  category: SkillCategory;
  description?: string;
  sortOrder?: number;
}

export type UpdateSkill = Partial<Omit<CreateSkill, "code">>;

/** Many-to-many between users and skills with optional proficiency. */
export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  proficiency: number | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface AssignSkillToUser {
  userId: string;
  skillId: string;
  proficiency?: number;
  expiresAt?: Date;
}

/** Many-to-many between services and skills required to perform them. */
export interface ServiceTypeRequiredSkill {
  id: string;
  serviceTypeId: string;
  skillId: string;
  minProficiency: number | null;
  createdAt: Date;
}

export interface AssignSkillToServiceType {
  serviceTypeId: string;
  skillId: string;
  minProficiency?: number;
}

/** Result of "which BAs can perform this service?". */
export interface EligibleBeautyAdvisor {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  specialty: string | null;
  matchedSkills: Array<{ code: string; proficiency: number | null }>;
}

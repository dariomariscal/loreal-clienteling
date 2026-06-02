/**
 * Skill category — controls how the UI groups skills in pickers and how
 * routing weights them (brand certifications are usually mandatory, while
 * languages are soft preferences).
 */
export const SkillCategory = {
  BRAND: "brand",
  SERVICE: "service",
  LANGUAGE: "language",
  CERTIFICATION: "certification",
} as const;

export type SkillCategory =
  (typeof SkillCategory)[keyof typeof SkillCategory];

export const SKILL_CATEGORIES = Object.values(SkillCategory);

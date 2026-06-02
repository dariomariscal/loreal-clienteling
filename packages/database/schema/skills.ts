import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { serviceTypes } from "./service-types";

/**
 * Catalog of BA skills. Industry pattern from Salesforce Scheduler
 * (`Skill` object) — a controlled vocabulary so the same skill is
 * spelled consistently across the org. Skills are the routing primitive
 * that matches a service requirement to the BAs qualified for it.
 *
 * Examples for L'Oréal:
 *   lancome_advanced | ysl_makeup | kiehls_skincare | fragrance_expert
 *   bridal_makeup    | sensitive_skin_certified
 *   lang_es | lang_en | lang_fr
 */
export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  /**
   * Grouping for the picker UI: brand | service | language | certification.
   */
  category: varchar("category", { length: 20 }).notNull().default("service"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Many-to-many: which BAs hold which skills, with optional proficiency
 * level. Salesforce `ServiceResourceSkill` analog.
 */
export const userSkills = pgTable(
  "user_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    /** 1-5; null = unspecified / binary. */
    proficiency: integer("proficiency"),
    /** Optional certification expiry date for compliance-bound skills. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_skills_user_skill_idx").on(table.userId, table.skillId),
    index("user_skills_skill_idx").on(table.skillId),
  ],
);

/**
 * Many-to-many: which skills are required for a service. If a service has
 * N skills, a BA must hold ALL of them to be eligible (AND semantics).
 * If you need OR routing, model multiple service variants.
 */
export const serviceTypeRequiredSkills = pgTable(
  "service_type_required_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    /** Minimum proficiency required (1-5); null = any. */
    minProficiency: integer("min_proficiency"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("service_type_required_skills_idx").on(
      table.serviceTypeId,
      table.skillId,
    ),
  ],
);

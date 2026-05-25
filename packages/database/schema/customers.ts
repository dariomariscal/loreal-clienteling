import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  boolean,
  numeric,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { users } from "./auth";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).unique(),
    phone: varchar("phone", { length: 20 }).unique(),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    gender: varchar("gender", { length: 20 }), // female | male | non_binary | prefer_not_say
    birthday: date("birthday"),

    preferredLanguage: varchar("preferred_language", { length: 10 })
      .notNull()
      .default("es-MX"),
    preferredChannel: varchar("preferred_channel", { length: 20 }), // whatsapp | sms | email | in_person
    acceptsMarketingEmail: boolean("accepts_marketing_email")
      .notNull()
      .default(false),
    acceptsMarketingSms: boolean("accepts_marketing_sms")
      .notNull()
      .default(false),
    acceptsMarketingWhatsapp: boolean("accepts_marketing_whatsapp")
      .notNull()
      .default(false),

    taxId: varchar("tax_id", { length: 20 }), // RFC

    signupStoreId: uuid("signup_store_id")
      .notNull()
      .references(() => stores.id),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    assignedToUserId: text("assigned_to_user_id").references(() => users.id),

    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),

    // Denormalized lifetime metrics. Maintained by trigger or app code on
    // order create/update; recomputing on every render is too expensive.
    totalSpent: numeric("total_spent", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    ordersCount: integer("orders_count").notNull().default(0),
    averageOrderValue: numeric("average_order_value", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    loyaltyTier: varchar("loyalty_tier", { length: 20 }), // bronze | silver | gold | platinum | vip
    loyaltyPoints: integer("loyalty_points").notNull().default(0),

    lifecycleStage: varchar("lifecycle_stage", { length: 20 })
      .notNull()
      .default("new"), // new | returning | vip | at_risk | dormant
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("customers_store_idx").on(table.signupStoreId),
    index("customers_name_idx").on(table.firstName, table.lastName),
    index("customers_lifecycle_idx").on(table.lifecycleStage),
    index("customers_assigned_idx").on(table.assignedToUserId),
  ],
);

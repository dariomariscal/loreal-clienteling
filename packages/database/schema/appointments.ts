import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";
import { stores } from "./stores";
import { serviceTypes } from "./service-types";

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    staffUserId: text("staff_user_id")
      .notNull()
      .references(() => users.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id),

    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),

    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    // scheduled | confirmed | rescheduled | cancelled | completed | no_show

    notes: text("notes"),

    /** Pre-appointment form: goals, concerns, allergies the client surfaces ahead. */
    preForm: jsonb("pre_form").$type<{
      goals?: string[];
      concerns?: string[];
      allergies?: string[];
      notes?: string;
    }>(),
    /** Post-appointment notes & outcome captured by the advisor. */
    serviceOutcome: jsonb("service_outcome").$type<{
      productsUsed?: string[];
      satisfactionScore?: number;
      notes?: string;
    }>(),

    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    confirmationSentAt: timestamp("confirmation_sent_at", {
      withTimezone: true,
    }),

    isVirtual: boolean("is_virtual").notNull().default(false),
    meetingUrl: varchar("meeting_url", { length: 500 }),

    rescheduledFromAppointmentId: uuid("rescheduled_from_appointment_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("appointments_staff_idx").on(table.staffUserId),
    index("appointments_store_idx").on(table.storeId),
    index("appointments_start_idx").on(table.startTime),
    index("appointments_customer_idx").on(table.customerId),
  ],
);

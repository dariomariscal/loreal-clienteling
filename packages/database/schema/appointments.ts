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

    /**
     * Queryable outcome enum. Mirrors customer_visits.outcome taxonomy so
     * conversion / sample / follow-up reporting works without joining the
     * jsonb. Set at check-out; null while the appointment is still open.
     */
    outcomeCode: varchar("outcome_code", { length: 30 }),
    // sale_closed | sample_given | future_intent | no_purchase | referred_out

    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    confirmationSentAt: timestamp("confirmation_sent_at", {
      withTimezone: true,
    }),
    /**
     * Set when the customer replies YES to the reminder SMS / clicks the
     * confirm link. Separate from confirmation_sent_at (which only tracks
     * that the system pushed a confirmation).
     */
    confirmedByCustomerAt: timestamp("confirmed_by_customer_at", {
      withTimezone: true,
    }),

    /** Cancellation tracking — required for analytics on cancel reasons. */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByUserId: text("cancelled_by_user_id").references(() => users.id),
    cancellationReason: varchar("cancellation_reason", { length: 40 }),
    // customer_request | scheduling_conflict | sick | weather | store_closed
    // | duplicate | other
    /** Free-text reason captured when status flips to no_show. */
    noShowReason: varchar("no_show_reason", { length: 40 }),
    // forgot | running_late_gave_up | found_alternative | unknown | other

    isVirtual: boolean("is_virtual").notNull().default(false),
    meetingUrl: varchar("meeting_url", { length: 500 }),

    rescheduledFromAppointmentId: uuid("rescheduled_from_appointment_id"),

    /**
     * Recurring series id. All appointments in a recurring booking share the
     * same value; null for one-offs. The "template" / first occurrence has
     * its id equal to seriesId.
     */
    seriesId: uuid("series_id"),
    /** Sequence within the series (1-indexed). Null for one-offs. */
    seriesSequence: integer("series_sequence"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("appointments_staff_idx").on(table.staffUserId),
    index("appointments_store_idx").on(table.storeId),
    index("appointments_start_idx").on(table.startTime),
    index("appointments_customer_idx").on(table.customerId),
    index("appointments_series_idx").on(table.seriesId),
    index("appointments_status_idx").on(table.status),
  ],
);

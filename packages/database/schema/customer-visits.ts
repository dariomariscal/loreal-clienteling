import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { stores } from "./stores";
import { users } from "./auth";
import { appointments } from "./appointments";

/**
 * Customer visit (a.k.a. store visit / client interaction record).
 *
 * Standard clienteling-platform pattern (Salesforce Consumer Goods Cloud
 * `Visit`, Dynamics 365 Commerce `Activity (type=Store visit)`, BSPK /
 * Mercaux "client interaction"). Captures EVERY time a customer engages
 * the counter — booked or walk-in, with or without a purchase — so the
 * advisor timeline is complete and reasons-for-visit are queryable.
 *
 * Relation to other tables:
 *   - appointments  : a planned visit. `appointmentId` links a walk-in that
 *                     materialized from a booking.
 *   - orders        : a converted visit. `convertedOrderId` ties the visit
 *                     to its receipt without forcing a 1:1 (a visit can end
 *                     in 0 or N orders).
 *   - samples / recommendations / notes / customer_media : children that
 *                     can optionally reference the visit so the whole
 *                     timeline rolls up under it.
 *
 * Two reason fields, on purpose (Salesforce convention):
 *   - bookedReason  : declared at appointment time (`new_purchase`,
 *                     `diagnostic`, etc.). Null for walk-ins.
 *   - visitReason   : captured by the BA at close-out. Always set on
 *                     `completed` visits — this is the authoritative
 *                     "why did the customer come in" for analytics.
 */
export const customerVisits = pgTable(
  "customer_visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    /** BA who attended the visit. Salesforce calls this `Visitor`. */
    attendedByUserId: text("attended_by_user_id")
      .notNull()
      .references(() => users.id),
    /** Set when the visit started from a booked appointment. */
    appointmentId: uuid("appointment_id").references(() => appointments.id),

    /** in_store | virtual | phone | whatsapp */
    visitChannel: varchar("visit_channel", { length: 20 })
      .notNull()
      .default("in_store"),

    /**
     * Sequence number for this customer (1 = first ever visit). Industry
     * pattern from Tulip / BSPK ("3rd visit"). Maintained by the service
     * on insert.
     */
    visitNumber: integer("visit_number").notNull(),

    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),

    /** Pre-declared reason from the appointment flow. Null for walk-ins. */
    bookedReason: varchar("booked_reason", { length: 40 }),
    /**
     * BA-captured reason at close-out. Required once status=completed.
     * Standard beauty taxonomy:
     *   browsing | replenishment | new_purchase | gift | diagnostic
     *   | fragrance_discovery | makeup_lesson | bridal_event_prep | return
     *   | complaint | loyalty_redemption | event_attendance | vip_private
     *   | click_collect_pickup
     */
    visitReason: varchar("visit_reason", { length: 40 }),

    /** in_progress | completed | abandoned | no_show */
    status: varchar("status", { length: 20 })
      .notNull()
      .default("in_progress"),

    /** purchased | no_purchase | sample_given | followup_needed | return_processed */
    outcome: varchar("outcome", { length: 30 }),

    /** Party size — luxury / high-end retail standard ("vino sola/acompañada"). */
    partySize: integer("party_size").notNull().default(1),

    /** positive | neutral | negative — BA-attested at close-out. */
    sentiment: varchar("sentiment", { length: 10 }),

    /** Products the customer examined or that were shown to them. */
    productsViewed: jsonb("products_viewed").$type<
      Array<{ productId: string; variantId?: string }>
    >(),

    notes: text("notes"),

    /** First / primary order generated from the visit, if any. */
    convertedOrderId: uuid("converted_order_id"),

    followUpDate: timestamp("follow_up_date", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("customer_visits_customer_started_idx").on(
      table.customerId,
      table.startedAt,
    ),
    index("customer_visits_store_started_idx").on(
      table.storeId,
      table.startedAt,
    ),
    index("customer_visits_attended_by_idx").on(table.attendedByUserId),
    index("customer_visits_status_idx").on(table.status),
    index("customer_visits_visit_reason_idx").on(table.visitReason),
    index("customer_visits_appointment_idx").on(table.appointmentId),
  ],
);

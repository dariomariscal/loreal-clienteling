/**
 * Customer visit (a.k.a. store visit / client interaction).
 *
 * Taxonomies aligned with the patterns shipped by Salesforce Consumer Goods
 * Cloud `Visit`, Microsoft Dynamics 365 Commerce clienteling, Tulip, BSPK
 * and Mercaux. See packages/database/schema/customer-visits.ts for the
 * column-level mapping.
 */

/** Visit lifecycle. Mirrors Salesforce CG Cloud's `Visit.Status`. */
export const VisitStatus = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
  NO_SHOW: "no_show",
} as const;

export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const VISIT_STATUSES = Object.values(VisitStatus);

/** Channel through which the visit happened. */
export const VisitChannel = {
  IN_STORE: "in_store",
  VIRTUAL: "virtual",
  PHONE: "phone",
  WHATSAPP: "whatsapp",
} as const;

export type VisitChannel = (typeof VisitChannel)[keyof typeof VisitChannel];

export const VISIT_CHANNELS = Object.values(VisitChannel);

/**
 * BA-captured reason for the visit at close-out. Standard beauty / luxury
 * retail taxonomy combining Sephora Beauty Services, Tulip beauty configs
 * and Salesforce Consumer Goods Cloud.
 *
 * Distinct from `BookedReason` (declared at appointment time). When both
 * are present, this one wins for analytics — it is what actually happened.
 */
export const VisitReason = {
  BROWSING: "browsing",
  REPLENISHMENT: "replenishment",
  NEW_PURCHASE: "new_purchase",
  GIFT: "gift",
  DIAGNOSTIC: "diagnostic",
  FRAGRANCE_DISCOVERY: "fragrance_discovery",
  MAKEUP_LESSON: "makeup_lesson",
  BRIDAL_EVENT_PREP: "bridal_event_prep",
  RETURN: "return",
  COMPLAINT: "complaint",
  LOYALTY_REDEMPTION: "loyalty_redemption",
  EVENT_ATTENDANCE: "event_attendance",
  VIP_PRIVATE: "vip_private",
  CLICK_COLLECT_PICKUP: "click_collect_pickup",
} as const;

export type VisitReason = (typeof VisitReason)[keyof typeof VisitReason];

export const VISIT_REASONS = Object.values(VisitReason);

/**
 * Reason a customer pre-declared when booking the appointment. Subset of
 * VisitReason — appointments aren't booked for "browsing" or "complaint".
 */
export const BookedReason = {
  NEW_PURCHASE: "new_purchase",
  REPLENISHMENT: "replenishment",
  GIFT: "gift",
  DIAGNOSTIC: "diagnostic",
  FRAGRANCE_DISCOVERY: "fragrance_discovery",
  MAKEUP_LESSON: "makeup_lesson",
  BRIDAL_EVENT_PREP: "bridal_event_prep",
  LOYALTY_REDEMPTION: "loyalty_redemption",
  EVENT_ATTENDANCE: "event_attendance",
  VIP_PRIVATE: "vip_private",
  CLICK_COLLECT_PICKUP: "click_collect_pickup",
} as const;

export type BookedReason = (typeof BookedReason)[keyof typeof BookedReason];

export const BOOKED_REASONS = Object.values(BookedReason);

/** Outcome of the visit, captured by the BA at close-out. */
export const VisitOutcome = {
  PURCHASED: "purchased",
  NO_PURCHASE: "no_purchase",
  SAMPLE_GIVEN: "sample_given",
  FOLLOWUP_NEEDED: "followup_needed",
  RETURN_PROCESSED: "return_processed",
} as const;

export type VisitOutcome = (typeof VisitOutcome)[keyof typeof VisitOutcome];

export const VISIT_OUTCOMES = Object.values(VisitOutcome);

/** BA-attested customer sentiment during the visit. */
export const VisitSentiment = {
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
} as const;

export type VisitSentiment =
  (typeof VisitSentiment)[keyof typeof VisitSentiment];

export const VISIT_SENTIMENTS = Object.values(VisitSentiment);

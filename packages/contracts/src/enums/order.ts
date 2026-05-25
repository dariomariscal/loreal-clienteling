/**
 * Where the order originated. Mirrors Shopify's `source_name`.
 */
export const OrderSource = {
  POS_INTEGRATION: "pos_integration",
  MANUAL: "manual",
  ECOMMERCE: "ecommerce",
  SHOPIFY: "shopify",
  SAP: "sap",
} as const;

export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const ORDER_SOURCES = Object.values(OrderSource);

/**
 * Channel the order came through.
 */
export const OrderChannel = {
  IN_STORE: "in_store",
  ONLINE: "online",
  MOBILE_APP: "mobile_app",
  WHATSAPP_LINK: "whatsapp_link",
  CLIENTELING_LINK: "clienteling_link",
} as const;

export type OrderChannel = (typeof OrderChannel)[keyof typeof OrderChannel];

export const ORDER_CHANNELS = Object.values(OrderChannel);

/**
 * Why a particular advisor got credit for the order.
 */
export const AttributionSource = {
  LAST_CONSULTATION: "last_consultation",
  ACTIVE_RECOMMENDATION: "active_recommendation",
  DIRECT_ASSISTANCE: "direct_assistance",
  TRACKING_LINK: "tracking_link",
  APPOINTMENT: "appointment",
} as const;

export type AttributionSource =
  (typeof AttributionSource)[keyof typeof AttributionSource];

export const ATTRIBUTION_SOURCES = Object.values(AttributionSource);

/**
 * Shopify-standard financial / fulfillment states. Reused so downstream
 * pipelines can map directly.
 */
export const FinancialStatus = {
  PENDING: "pending",
  PAID: "paid",
  PARTIALLY_REFUNDED: "partially_refunded",
  REFUNDED: "refunded",
  VOIDED: "voided",
} as const;

export type FinancialStatus =
  (typeof FinancialStatus)[keyof typeof FinancialStatus];

export const FulfillmentStatus = {
  UNFULFILLED: "unfulfilled",
  PARTIAL: "partial",
  FULFILLED: "fulfilled",
  RESTOCKED: "restocked",
} as const;

export type FulfillmentStatus =
  (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];

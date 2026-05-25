export const Gender = {
  FEMALE: "female",
  MALE: "male",
  NON_BINARY: "non_binary",
  PREFER_NOT_SAY: "prefer_not_say",
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export const GENDERS = Object.values(Gender);

/**
 * Lifecycle stage of a customer. Standard CRM terminology (HubSpot
 * `lifecyclestage`, Salesforce, Klaviyo). "Stage", not "segment" — a segment
 * is a saved filter, a stage is where the customer is in the journey.
 */
export const LifecycleStage = {
  NEW: "new",
  RETURNING: "returning",
  VIP: "vip",
  AT_RISK: "at_risk",
  DORMANT: "dormant",
} as const;

export type LifecycleStage =
  (typeof LifecycleStage)[keyof typeof LifecycleStage];

export const LIFECYCLE_STAGES = Object.values(LifecycleStage);

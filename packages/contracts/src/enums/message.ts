export const CommunicationChannel = {
  WHATSAPP: "whatsapp",
  SMS: "sms",
  EMAIL: "email",
  IN_APP: "in_app",
} as const;

export type CommunicationChannel =
  (typeof CommunicationChannel)[keyof typeof CommunicationChannel];

export const COMMUNICATION_CHANNELS = Object.values(CommunicationChannel);

/**
 * Campaign / flow trigger for an outbound message. Mirrors Klaviyo's "flow"
 * and Salesforce Marketing Cloud's "campaign type" so future integrations
 * map cleanly. `null` for inbound messages.
 */
export const CampaignType = {
  BIRTHDAY: "birthday",
  REPLENISHMENT: "replenishment",
  WIN_BACK: "win_back",
  NEW_LAUNCH: "new_launch",
  POST_PURCHASE: "post_purchase",
  APPOINTMENT_REMINDER: "appointment_reminder",
  ABANDONED_CART: "abandoned_cart",
  SPECIAL_EVENT: "special_event",
  MANUAL: "manual",
  CUSTOM: "custom",
} as const;

export type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

export const CAMPAIGN_TYPES = Object.values(CampaignType);

/**
 * Direction of a message relative to the brand:
 * - `outbound` — sent by the advisor to the customer.
 * - `inbound`  — received from the customer (provider webhook).
 *
 * Naming follows the de-facto industry standard (Twilio, MessageBird, Front,
 * Intercom) so future provider integrations map cleanly.
 */
export const MessageDirection = {
  OUTBOUND: "outbound",
  INBOUND: "inbound",
} as const;

export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export const MESSAGE_DIRECTIONS = Object.values(MessageDirection);

/**
 * Provider-agnostic delivery status. Mirrors the well-known Twilio /
 * WhatsApp Business lifecycle so any external messaging service can be
 * mapped 1:1 without inventing extra states.
 */
export const MessageStatus = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  RECEIVED: "received", // inbound only
} as const;

export type MessageStatus =
  (typeof MessageStatus)[keyof typeof MessageStatus];

export const MESSAGE_STATUSES = Object.values(MessageStatus);

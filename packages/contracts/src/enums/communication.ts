export const CommunicationChannel = {
  WHATSAPP: "whatsapp",
  SMS: "sms",
  EMAIL: "email",
} as const;

export type CommunicationChannel =
  (typeof CommunicationChannel)[keyof typeof CommunicationChannel];

export const COMMUNICATION_CHANNELS = Object.values(CommunicationChannel);

export const FollowupType = {
  THREE_MONTHS: "3_months",
  SIX_MONTHS: "6_months",
  BIRTHDAY: "birthday",
  REPLENISHMENT: "replenishment",
  SPECIAL_EVENT: "special_event",
  CUSTOM: "custom",
} as const;

export type FollowupType = (typeof FollowupType)[keyof typeof FollowupType];

export const FOLLOWUP_TYPES = Object.values(FollowupType);

/**
 * Direction of a message relative to the brand:
 * - `outbound` — sent by the BA to the customer.
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

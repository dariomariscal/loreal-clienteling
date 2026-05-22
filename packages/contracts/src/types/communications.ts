import type {
  CommunicationChannel,
  FollowupType,
  MessageDirection,
  MessageStatus,
} from "../enums/communication";

/**
 * Payload to record a new message. Used both by:
 * - The "send" endpoint (outbound, defaults set by service).
 * - The provider webhook ingestor (inbound, sets `direction: "inbound"`).
 */
export interface CreateCommunication {
  customerId: string;
  channel: CommunicationChannel;
  body: string;
  direction?: MessageDirection;
  status?: MessageStatus;
  fromAddress?: string;
  toAddress?: string;
  externalId?: string;
  templateId?: string;
  subject?: string;
  /** Required for outbound campaign-style messages, omitted for inbound. */
  followupType?: FollowupType;
  failureReason?: string;
}

/**
 * Full message record as returned by the API. Mirrors the DB row.
 */
export interface Communication {
  id: string;
  customerId: string;
  sentByUserId: string | null;
  direction: MessageDirection;
  channel: CommunicationChannel;
  status: MessageStatus;
  fromAddress: string | null;
  toAddress: string | null;
  externalId: string | null;
  templateId: string | null;
  subject: string | null;
  body: string;
  followupType: FollowupType | null;
  failureReason: string | null;
  sentAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  respondedAt: Date | null;
  createdAt: Date;
}

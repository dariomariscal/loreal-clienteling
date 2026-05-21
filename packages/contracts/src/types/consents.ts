export interface GrantConsent {
  customerId: string;
  type: string;
  version: string;
  source: string;
  signatureUrl?: string;
  userAgent?: string;
}

export interface RevokeConsent {
  customerId: string;
  type: string;
}

export interface Consent {
  id: string;
  customerId: string;
  type: string;
  version: string;
  acceptedAt: string;
  revokedAt: string | null;
  confirmedAt: string | null;
  source: string;
  ipAddress: string | null;
  userAgent: string | null;
  signatureUrl: string | null;
  createdAt: string;
}

export interface PrivacyNotice {
  id: string;
  version: string;
  language: string;
  title: string;
  bodyMarkdown: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

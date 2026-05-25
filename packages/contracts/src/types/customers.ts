export interface CreateCustomer {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthday?: Date;
}

export type UpdateCustomer = Partial<CreateCustomer>;

export interface SearchCustomer {
  query: string;
  type?: "exact" | "name" | "semantic";
}

export interface CustomerFilters {
  /** Filter by lifecycle stage (new | returning | vip | at_risk | dormant). */
  stage?: string;
  storeId?: string;
  brandId?: string;
}

/**
 * Atomic registration payload: customer + privacy notice acceptance + marketing
 * channel preferences in a single transaction. The wizard's "Save" button maps
 * one-to-one to this shape.
 */
export interface RegisterCustomer {
  customer: CreateCustomer;
  consents: {
    privacyNoticeVersion: string;
    signatureUrl: string;
    marketingChannels: {
      email?: boolean;
      sms?: boolean;
      whatsapp?: boolean;
    };
  };
}

export interface DuplicateMatch {
  customerId: string;
  firstName: string;
  lastName: string;
  matchedOn: "email" | "phone";
  /** Store display name for context — never raw IDs of stores the BA can't access. */
  storeName: string;
  inUserScope: boolean;
}

export interface DuplicateCheckResponse {
  hasMatch: boolean;
  matches: DuplicateMatch[];
}

/**
 * Cached three-line AI summary shown at the top of a customer's profile.
 * Owned by the backend; the frontend only consumes it.
 */
export interface CustomerAiSummary {
  customerId: string;
  summaryText: string;
  model: string;
  promptVersion: string;
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Inputs required to build the prompt context for a summary. Plain data —
 * no framework types — so the prompt builder in `@loreal/domain` can run in
 * isolation.
 */
export interface CustomerSummaryContext {
  firstName: string;
  lastName: string;
  ageYears?: number;
  customerSince: Date;
  lifecycleSegment: string;
  lastVisitDaysAgo?: number;
  averagePurchaseIntervalDays?: number;
  recentPurchases: Array<{
    productName: string;
    daysAgo: number;
    price: number;
  }>;
  recentNotes: Array<{
    body: string;
    daysAgo: number;
  }>;
  knownPreferences?: string[];
  knownAllergies?: string[];
  upcomingAppointment?: {
    whenIso: string;
    location?: string;
  };
}

/**
 * Result of resolving a scanned barcode/SKU for a beauty advisor.
 * One round-trip from the scan UI: variant + stock + customer signals +
 * the ordered list of bottom-sheet actions the BA should see.
 */
export interface ScanLookupResult {
  variant: {
    id: string;
    sku: string;
    barcode: string | null;
    title: string;
    /** option1 / option2 / option3 collapsed for display ("240W" or "50 ml"). */
    optionLabel: string | null;
    swatchHex: string | null;
    imageUrl: string | null;
    price: number;
  };
  product: {
    id: string;
    title: string;
    category: string;
    subcategory: string | null;
    /** Days a single user typically takes to finish. Drives replenishmentDue. */
    replenishmentDays: number | null;
    brand: {
      id: string;
      code: string;
      displayName: string;
      tier: string;
    };
  };
  stock: {
    thisStore: {
      storeId: string;
      storeName: string;
      available: number;
      status: string;
    } | null;
    nearbyStores: Array<{
      storeId: string;
      storeName: string;
      city: string;
      state: string;
      available: number;
      status: string;
    }>;
    nationalAvailable: number;
  };
  /**
   * Populated only when ?customerId= was passed AND the customer exists
   * within the BA's scope. Null otherwise (anonymous scan).
   */
  customerMatch: {
    customerId: string;
    isHistoricalShade: boolean;
    /** ISO date string of the last order containing this variant. */
    lastPurchasedAt: string | null;
    daysSinceLastPurchase: number | null;
    /** True when daysSinceLastPurchase >= replenishmentDays. */
    replenishmentDue: boolean;
    inWishlist: boolean;
    sampleGivenBefore: boolean;
  } | null;
  /**
   * Ordered list of bottom-sheet actions for the BA, with priority hints.
   * The front renders them as a vertical action stack; lower priority = higher
   * placement.
   */
  suggestedActions: Array<{
    type: ScanActionType;
    label: string;
    priority: number;
    /** Optional one-line reason ("Su shade oficial — recompra esperada"). */
    reason?: string;
  }>;
}

export type ScanActionType =
  | "add_to_cart"
  | "add_to_wishlist"
  | "reserve"
  | "sample_logged"
  | "shown_to_customer"
  | "send_whatsapp"
  | "viewed_only";

export interface CreateScanEvent {
  variantId: string;
  customerId?: string;
  actionTaken?: ScanActionType;
}

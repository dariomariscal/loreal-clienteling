import type { PreparedProductStatus } from "../enums/appointment";

/**
 * One product the BA preselected for the appointment ("ideabook" pattern
 * BSPK / Tulip). The lifecycle (`prepared → shown → tried → purchased | declined`)
 * lets us measure try-to-buy rates and most-shown SKUs per service type.
 */
export interface AppointmentPreparedProduct {
  id: string;
  appointmentId: string;
  productId: string;
  variantId: string | null;
  position: number;
  status: PreparedProductStatus;
  note: string | null;
  addedByUserId: string;
  addedAt: Date;
  statusChangedAt: Date | null;
}

export interface AddPreparedProduct {
  productId: string;
  variantId?: string;
  position?: number;
  note?: string;
  /** Defaults to "prepared" — only override when seeding historical data. */
  status?: PreparedProductStatus;
}

export interface UpdatePreparedProductStatus {
  status: PreparedProductStatus;
  note?: string;
}

/** GET /appointments/:id/prepared-products response item, enriched for UI. */
export interface PreparedProductWithCatalog
  extends AppointmentPreparedProduct {
  product: {
    id: string;
    sku: string;
    title: string;
    images: unknown;
    price: string;
  };
}

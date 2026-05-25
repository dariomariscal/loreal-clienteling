export interface CreateProduct {
  sku: string;
  title: string;
  brandId: string;
  category: string;
  subcategory?: string;
  productType?: string;
  description?: string;
  price: number;
  /** Days a single user typically takes to finish the product. Drives replenishment. */
  replenishmentDays?: number;
  images?: string[];
}

export type UpdateProduct = Partial<CreateProduct>;

export type BulkImportMode = "atomic" | "best_effort";

export interface BulkCreateProducts {
  products: CreateProduct[];
  mode?: BulkImportMode;
}

export interface BulkImportRowResult {
  index: number;
  sku: string;
  status: "inserted" | "skipped" | "failed";
  productId?: string;
  error?: string;
}

export interface BulkImportResult {
  inserted: number;
  failed: number;
  rows: BulkImportRowResult[];
}

export const BULK_PRODUCT_LIMIT = 500;

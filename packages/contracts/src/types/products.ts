export interface CreateProduct {
  sku: string;
  name: string;
  brandId: string;
  category: string;
  subcategory?: string;
  description?: string;
  price: number;
  estimatedDurationDays?: number;
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

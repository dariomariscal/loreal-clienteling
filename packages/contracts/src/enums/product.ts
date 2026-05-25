/**
 * Top-level product taxonomy. Aligned with major beauty retailers (Sephora,
 * Ulta) and Shopify-style `product_type`.
 */
export const ProductCategory = {
  SKINCARE: "skincare",
  MAKEUP: "makeup",
  FRAGRANCE: "fragrance",
  HAIRCARE: "haircare",
  BODYCARE: "bodycare",
  TOOLS: "tools",
  GIFT_SET: "gift_set",
} as const;

export type ProductCategory =
  (typeof ProductCategory)[keyof typeof ProductCategory];

export const PRODUCT_CATEGORIES = Object.values(ProductCategory);

/**
 * Shopify-standard product lifecycle status.
 */
export const ProductStatus = {
  ACTIVE: "active",
  DRAFT: "draft",
  ARCHIVED: "archived",
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const PRODUCT_STATUSES = Object.values(ProductStatus);

export const StockStatus = {
  AVAILABLE: "available",
  LOW: "low",
  OUT_OF_STOCK: "out_of_stock",
} as const;

export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

export const STOCK_STATUSES = Object.values(StockStatus);

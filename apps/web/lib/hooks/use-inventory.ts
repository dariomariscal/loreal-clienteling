import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────

export type StockStatus = "available" | "low" | "out_of_stock";

export interface InventoryAlert {
  inventoryLevelId: string;
  productId: string;
  variantId: string | null;
  storeId: string;
  availableQuantity: number;
  committedQuantity: number;
  stockStatus: StockStatus;
  lastSyncedAt: string;
  productTitle: string | null;
  productSku: string | null;
  variantTitle: string | null;
  variantSku: string | null;
}

export interface InventoryAlertsFilters {
  storeId?: string;
  /** Defaults to ['low', 'out_of_stock'] on the server. */
  status?: StockStatus | StockStatus[];
  limit?: number;
}

// ── Query keys ─────────────────────────────────────────────────────

const inventoryKeys = {
  alerts: (filters: InventoryAlertsFilters) =>
    ["inventory", "alerts", filters] as const,
  zoneSummary: (limit?: number) =>
    ["inventory", "zone-summary", limit] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useInventoryAlerts(filters: InventoryAlertsFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.storeId) params.storeId = filters.storeId;
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.status) {
    params.status = Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters.status;
  }

  return useQuery({
    queryKey: inventoryKeys.alerts(filters),
    queryFn: () => api.get<InventoryAlert[]>("/inventory/alerts", params),
  });
}

// ── Zone summary (Area Manager / National Retail Manager) ─────────

export interface InventoryByStoreRow {
  storeId: string;
  storeName: string;
  total: number;
  available: number;
  low: number;
  outOfStock: number;
}

export interface InventoryTopAlertRow {
  productId: string;
  variantId: string | null;
  productTitle: string | null;
  productSku: string | null;
  variantTitle: string | null;
  variantSku: string | null;
  affectedStoreCount: number;
  totalAvailable: number;
}

export interface InventoryZoneSummary {
  scope: { storeCount: number | null };
  byStore: InventoryByStoreRow[];
  topAlerts: InventoryTopAlertRow[];
}

/**
 * Consolidated inventory roll-up across every store in the caller's scope.
 * `byStore` orders worst-first (most low + out_of_stock SKUs); `topAlerts`
 * surfaces SKUs that are short in the most stores within the zone.
 */
export function useInventoryZoneSummary(limit?: number) {
  return useQuery({
    queryKey: inventoryKeys.zoneSummary(limit),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (limit) params.limit = String(limit);
      return api.get<InventoryZoneSummary>(
        "/inventory/zone-summary",
        Object.keys(params).length ? params : undefined,
      );
    },
  });
}

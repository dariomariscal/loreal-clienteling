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

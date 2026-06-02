import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ScanLookupResult, ScanActionType } from "@loreal/contracts";

export type { ScanLookupResult, ScanActionType };

// ── Types ──────────────────────────────────────────────────────────

export interface ScanEvent {
  id: string;
  userId: string;
  variantId: string;
  customerId: string | null;
  storeId: string;
  actionTaken: ScanActionType | null;
  scannedAt: string;
}

export interface TodayScansSummary {
  total: number;
  converted: number;
}

export interface ScanLookupInput {
  barcode: string;
  /** Active customer in the BA session, when one is open. */
  customerId?: string;
}

export interface CreateScanEventInput {
  variantId: string;
  customerId?: string;
  actionTaken?: ScanActionType;
}

// ── Query keys ─────────────────────────────────────────────────────

const scanKeys = {
  today: () => ["scan-events", "today"] as const,
};

// ── Lookup ─────────────────────────────────────────────────────────

/**
 * Resolve a scanned barcode into the bottom-sheet payload. Modeled as a
 * mutation (not a query) because every scan is a one-shot, manually
 * triggered call from the camera — caching across barcodes would leak
 * stale stock/customerMatch state into the next scan.
 */
export function useScanLookup() {
  return useMutation({
    mutationFn: ({ barcode, customerId }: ScanLookupInput) => {
      const params: Record<string, string> = { barcode };
      if (customerId) params.customerId = customerId;
      return api.get<ScanLookupResult>("/products/lookup", params);
    },
  });
}

// ── Event tracking ─────────────────────────────────────────────────

/**
 * Persist a scan event. Call right after a successful lookup so the
 * counter manager / Today screen can report "X scans · Y converted"
 * even if the BA never picks a bottom-sheet action.
 */
export function useCreateScanEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScanEventInput) =>
      api.post<ScanEvent>("/scan-events", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scanKeys.today() });
    },
  });
}

/**
 * Mark the action the BA ended up taking on a previously created scan
 * event. Drives conversion ratios on the Today / Counter dashboards.
 */
export function useSetScanAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      actionTaken,
    }: {
      id: string;
      actionTaken: ScanActionType;
    }) =>
      api.patch<ScanEvent>(`/scan-events/${id}/action`, { actionTaken }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scanKeys.today() });
    },
  });
}

/**
 * Aggregate of today's scans for the current BA — total + converted
 * (add_to_cart / sample_logged / reserve). Feeds the Today strip.
 */
export function useTodayScans(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: scanKeys.today(),
    queryFn: () => api.get<TodayScansSummary>("/scan-events/today"),
    enabled: options?.enabled ?? true,
  });
}

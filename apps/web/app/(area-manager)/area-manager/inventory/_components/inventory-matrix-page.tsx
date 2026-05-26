"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useInventoryZoneSummary, type StockStatus } from "@/lib/hooks/use-inventory";
import { useStores } from "@/lib/hooks/use-stores";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CloseGlyph } from "@/components/ui/glyphs";
import {
  InventoryMatrix,
  InventoryMatrixLegend,
  type MatrixCellData,
  type MatrixCol,
  type MatrixRow,
} from "@/components/manager/inventory-matrix";

interface InventoryAlertCell {
  productId: string;
  variantId: string | null;
  storeId: string;
  stockStatus: StockStatus;
  availableQuantity: number;
  productTitle: string | null;
  variantTitle: string | null;
}

interface CellSelection {
  row: MatrixRow;
  col: MatrixCol;
  cell: MatrixCellData | undefined;
}

/**
 * Full-bleed inventory matrix.
 *
 * Rows = top-affected SKUs (provided by the zone summary endpoint, already
 * sorted by "in how many stores it's short").
 * Cols = stores in the area manager's scope.
 * Cells = stock status per (sku, store). Fetched per-store with React
 * Query's parallel queries; cache is keyed individually so revisits are
 * instant.
 */
export function InventoryMatrixPage() {
  const { data: summary, isLoading: summaryLoading } = useInventoryZoneSummary(
    40,
  );
  const { data: storesAll } = useStores();
  const [selection, setSelection] = useState<CellSelection | null>(null);

  // Stores in scope = the ones the summary reports on.
  const stores = useMemo(() => {
    if (!summary || !storesAll) return [];
    const inScope = new Set(summary.byStore.map((s) => s.storeId));
    return storesAll.filter((s) => inScope.has(s.id));
  }, [summary, storesAll]);

  // Pull alerts per store in parallel — React Query handles caching.
  const alertsPerStore = useQueries({
    queries: stores.map((store) => ({
      queryKey: ["inventory", "alerts", { storeId: store.id, limit: "200" }],
      queryFn: () =>
        api.get<InventoryAlertCell[]>("/inventory/alerts", {
          storeId: store.id,
          limit: "200",
          // We want every status to fill cells (default backend returns
          // only low/out_of_stock; we explicitly request all three).
          status: "available,low,out_of_stock",
        }),
      enabled: stores.length > 0,
    })),
  });

  const allCellsLoaded = alertsPerStore.every((q) => !q.isLoading);

  // Build the lookup map: `${productId}::${storeId}` → cell.
  const cellLookup = useMemo(() => {
    const out: Record<string, MatrixCellData | undefined> = {};
    stores.forEach((store, idx) => {
      const rows = alertsPerStore[idx]?.data ?? [];
      for (const row of rows) {
        const rowKey = row.variantId ?? row.productId;
        const key = `${rowKey}::${store.id}`;
        out[key] = {
          status: row.stockStatus,
          available: row.availableQuantity,
        };
      }
    });
    return out;
  }, [stores, alertsPerStore]);

  // Row keys come from the zone summary's topAlerts. Each row is a SKU.
  const rows: MatrixRow[] = useMemo(() => {
    if (!summary) return [];
    return summary.topAlerts.map((alert) => ({
      id: alert.variantId ?? alert.productId,
      label:
        alert.productTitle ??
        alert.productSku ??
        alert.variantTitle ??
        "SKU sin nombre",
      sublabel:
        [alert.variantTitle, alert.productSku].filter(Boolean).join(" · ") ||
        undefined,
    }));
  }, [summary]);

  const cols: MatrixCol[] = useMemo(
    () =>
      stores.map((s) => ({
        id: s.id,
        label: s.displayName,
        sublabel: s.banner ?? undefined,
      })),
    [stores],
  );

  // Pre-compute the per-row "affected count" so the matrix can draw the
  // heat bar on the left edge of each row.
  const rowAffectedCount = useMemo(() => {
    const out: Record<string, number> = {};
    for (const row of rows) {
      let n = 0;
      for (const col of cols) {
        const cell = cellLookup[`${row.id}::${col.id}`];
        if (cell?.status === "low" || cell?.status === "out_of_stock") n += 1;
      }
      out[row.id] = n;
    }
    return out;
  }, [rows, cols, cellLookup]);

  const loading = summaryLoading || !allCellsLoaded;

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-[family-name:var(--font-heading)] text-2xl tracking-tight text-foreground">
              Inventario — matriz por tienda
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Top SKUs con gaps en la zona ·{" "}
              {summary?.scope.storeCount ?? "—"} tiendas, {rows.length} SKUs
            </p>
          </div>
          <InventoryMatrixLegend />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden bg-background">
        <InventoryMatrix
          rows={rows}
          cols={cols}
          cells={cellLookup}
          rowAffectedCount={rowAffectedCount}
          onCellTap={(row, col, cell) => setSelection({ row, col, cell })}
          loading={loading}
          className="h-full w-full"
        />
      </div>

      {selection ? (
        <CellSelectionSheet
          selection={selection}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </section>
  );
}

// ── Cell detail sheet ─────────────────────────────────────────────────────

function CellSelectionSheet({
  selection,
  onClose,
}: {
  selection: CellSelection;
  onClose: () => void;
}) {
  const { row, col, cell } = selection;
  const statusLabel =
    cell?.status === "available"
      ? "Disponible"
      : cell?.status === "low"
        ? "Stock bajo"
        : cell?.status === "out_of_stock"
          ? "Agotado"
          : "Sin datos";

  return (
    <div
      role="dialog"
      aria-label="Detalle de inventario"
      className="absolute right-4 bottom-4 left-4 sm:left-auto sm:w-96 rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {col.label}
          </p>
          <p className="mt-1 truncate font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">
            {row.label}
          </p>
          {row.sublabel ? (
            <p className="truncate text-xs text-muted-foreground">{row.sublabel}</p>
          ) : null}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {cell?.available ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              unidades · {statusLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="-mr-1 -mt-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CloseGlyph className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" disabled>
          Solicitar traspaso
        </Button>
      </div>
    </div>
  );
}

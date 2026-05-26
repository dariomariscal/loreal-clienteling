"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StockStatus = "available" | "low" | "out_of_stock" | "unknown";

export interface MatrixCellData {
  status: StockStatus;
  /** Optional available quantity; shown in the cell popover. */
  available?: number | null;
}

export interface MatrixRow {
  id: string;
  /** Primary label shown in the sticky first column (SKU/product name). */
  label: string;
  /** Secondary line under the label (variant title, SKU code, etc). */
  sublabel?: string;
}

export interface MatrixCol {
  id: string;
  label: string;
  sublabel?: string;
}

interface InventoryMatrixProps {
  rows: MatrixRow[];
  cols: MatrixCol[];
  /** Sparse map keyed by `${rowId}::${colId}` → cell data. */
  cells: Record<string, MatrixCellData | undefined>;
  /** Pre-resolved gap count per row (how many cols are low/out). Drives the
   *  default sort + the heat bar on the left edge of each row. */
  rowAffectedCount: Record<string, number>;
  onCellTap?: (row: MatrixRow, col: MatrixCol, cell: MatrixCellData | undefined) => void;
  loading?: boolean;
  className?: string;
}

/**
 * Conditional-formatted stock matrix. Three classes only (Tufte: more than
 * 3 colors stops being pre-attentive):
 *   green   = available
 *   amber   = low
 *   red     = out_of_stock
 *   neutral = no data
 *
 * The sticky first column carries SKU labels + a "gap intensity" bar — at a
 * glance the area manager can spot SKUs that are short in many stores
 * within the zone (the highlighted use case).
 */
export function InventoryMatrix({
  rows,
  cols,
  cells,
  rowAffectedCount,
  onCellTap,
  loading,
  className,
}: InventoryMatrixProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const maxAffected = useMemo(
    () => Math.max(1, ...Object.values(rowAffectedCount)),
    [rowAffectedCount],
  );

  if (loading) {
    return (
      <div className={cn("space-y-1 p-4", className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-9 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (rows.length === 0 || cols.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-auto", className)}>
      <table className="border-separate border-spacing-0">
        <thead className="sticky top-0 z-20 bg-card">
          <tr>
            <th className="sticky left-0 z-30 w-64 min-w-[220px] border-b border-r border-border bg-card px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SKU
            </th>
            {cols.map((col) => (
              <th
                key={col.id}
                className="min-w-[88px] border-b border-border bg-card px-2 py-2 text-center text-[10px] font-medium text-muted-foreground"
                title={col.label}
              >
                <div className="line-clamp-2 leading-tight">{col.label}</div>
                {col.sublabel ? (
                  <div className="mt-0.5 text-[9px] text-muted-foreground/70">
                    {col.sublabel}
                  </div>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <MatrixRowEl
              key={row.id}
              row={row}
              cols={cols}
              cells={cells}
              affectedCount={rowAffectedCount[row.id] ?? 0}
              maxAffected={maxAffected}
              hoverKey={hoverKey}
              onHoverKey={setHoverKey}
              onCellTap={onCellTap}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatrixRowEl({
  row,
  cols,
  cells,
  affectedCount,
  maxAffected,
  hoverKey,
  onHoverKey,
  onCellTap,
}: {
  row: MatrixRow;
  cols: MatrixCol[];
  cells: Record<string, MatrixCellData | undefined>;
  affectedCount: number;
  maxAffected: number;
  hoverKey: string | null;
  onHoverKey: (k: string | null) => void;
  onCellTap?: (row: MatrixRow, col: MatrixCol, cell: MatrixCellData | undefined) => void;
}) {
  const affectedPct = (affectedCount / maxAffected) * 100;
  return (
    <tr className="group">
      <th
        scope="row"
        className="sticky left-0 z-10 w-64 min-w-[220px] border-b border-r border-border bg-card text-left"
      >
        <div className="flex h-12 items-center gap-2 px-3">
          <div
            aria-hidden
            className="h-9 w-1 shrink-0 rounded-full bg-muted"
            style={
              affectedCount > 0
                ? {
                    background: `linear-gradient(to top, var(--destructive) ${affectedPct}%, var(--color-muted) 0%)`,
                  }
                : undefined
            }
            title={`${affectedCount} tiendas con stock bajo / agotado`}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              {row.label}
            </p>
            {row.sublabel ? (
              <p className="truncate text-[10px] text-muted-foreground">
                {row.sublabel}
              </p>
            ) : null}
          </div>
        </div>
      </th>
      {cols.map((col) => {
        const key = `${row.id}::${col.id}`;
        const cell = cells[key];
        const hovered = hoverKey === key;
        return (
          <td
            key={col.id}
            className="border-b border-border p-1 align-middle"
            onMouseEnter={() => onHoverKey(key)}
            onMouseLeave={() => onHoverKey(null)}
          >
            <button
              type="button"
              onClick={() => onCellTap?.(row, col, cell)}
              aria-label={`${row.label} en ${col.label}: ${cell ? cellStatusLabel(cell.status) : "sin datos"}`}
              className={cn(
                "flex h-10 min-h-10 w-full items-center justify-center rounded-md text-[10px] font-semibold tabular-nums transition-all",
                cellClass(cell?.status),
                hovered && "scale-[1.04] ring-2 ring-foreground/40",
              )}
            >
              {cell?.available != null ? cell.available : ""}
            </button>
          </td>
        );
      })}
    </tr>
  );
}

function cellClass(status: StockStatus | undefined): string {
  switch (status) {
    case "available":
      return "bg-success/20 text-success hover:bg-success/30";
    case "low":
      return "bg-[var(--color-warning,oklch(0.75_0.15_65))]/20 text-[var(--color-warning,oklch(0.75_0.15_65))] hover:bg-[var(--color-warning,oklch(0.75_0.15_65))]/30";
    case "out_of_stock":
      return "bg-destructive/15 text-destructive hover:bg-destructive/25";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted/80";
  }
}

function cellStatusLabel(status: StockStatus): string {
  return status === "available"
    ? "disponible"
    : status === "low"
      ? "stock bajo"
      : status === "out_of_stock"
        ? "agotado"
        : "sin datos";
}

// ── Legend (used by hosting screens) ──────────────────────────────────────

interface LegendProps {
  className?: string;
}

export function InventoryMatrixLegend({ className }: LegendProps) {
  const entries: Array<{ status: StockStatus; label: string; swatch: ReactNode }> = [
    {
      status: "available",
      label: "Disponible",
      swatch: <span className="block size-3 rounded bg-success/40" />,
    },
    {
      status: "low",
      label: "Stock bajo",
      swatch: (
        <span className="block size-3 rounded bg-[var(--color-warning,oklch(0.75_0.15_65))]/40" />
      ),
    },
    {
      status: "out_of_stock",
      label: "Agotado",
      swatch: <span className="block size-3 rounded bg-destructive/40" />,
    },
    {
      status: "unknown",
      label: "Sin datos",
      swatch: <span className="block size-3 rounded bg-muted" />,
    },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs", className)}>
      {entries.map((e) => (
        <span
          key={e.status}
          className="inline-flex items-center gap-1.5 text-muted-foreground"
        >
          {e.swatch}
          {e.label}
        </span>
      ))}
    </div>
  );
}

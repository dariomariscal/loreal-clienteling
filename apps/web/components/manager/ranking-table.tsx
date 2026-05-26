"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { ChevronUpGlyph, ChevronDownGlyph } from "@/components/ui/glyphs";

export type RankingColumnAlign = "left" | "right";

export interface RankingColumn<T> {
  key: string;
  label: string;
  /** Cell renderer. Receives the row and computed rank (1-indexed). */
  render: (row: T, rank: number) => ReactNode;
  /** Sort accessor — when omitted the column is not sortable. */
  sortValue?: (row: T) => number;
  align?: RankingColumnAlign;
  /** Tailwind className applied to <th> and <td> — typically column width. */
  className?: string;
}

interface RankingTableProps<T> {
  rows: T[];
  columns: RankingColumn<T>[];
  getRowKey: (row: T) => string;
  /** Column key to sort by initially. Falls back to row order. */
  defaultSortKey?: string;
  /** Direction of the initial sort. */
  defaultSortDir?: "asc" | "desc";
  /** Optional row click handler (drill-down). Adds hover + cursor styles. */
  onRowClick?: (row: T) => void;
  /** Highlight the top N rows with a subtle gold tint (Tier-2 leaderboard). */
  spotlightTop?: number;
  /** Optional sticky first column — useful on iPad portrait with overflow. */
  stickyFirstColumn?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  loading?: boolean;
  /** Skeleton row count while loading. */
  loadingRows?: number;
  className?: string;
}

/**
 * Sortable dense table for cross-store / cross-team rankings.
 *
 * Anatomy (Cleveland's "longitude is the most accurate perceptual task"):
 *  - one column per metric, all `tabular-nums`
 *  - bar-in-cell, sparklines and spotlight tint live INSIDE the cells via
 *    custom column renderers, not in the table itself — keeps this component
 *    generic across "ranking stores" / "ranking counter managers" / etc.
 *  - sortable headers (click to flip direction)
 *  - sticky header so the iPad scroll keeps the column labels in view
 */
export function RankingTable<T>({
  rows,
  columns,
  getRowKey,
  defaultSortKey,
  defaultSortDir = "desc",
  onRowClick,
  spotlightTop = 0,
  stickyFirstColumn = false,
  emptyTitle = "Sin datos para mostrar",
  emptyDescription,
  emptyIcon,
  loading,
  loadingRows = 5,
  className,
}: RankingTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return copy;
  }, [rows, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (loading) {
    return (
      <div className={cn("space-y-2 px-4 py-3", className)}>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <AdvisorEmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
      />
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-2 pl-4 text-left font-medium w-10">#</th>
            {columns.map((col, idx) => {
              const sortable = !!col.sortValue;
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  className={cn(
                    "py-2 px-2 font-medium",
                    col.align === "right" ? "text-right" : "text-left",
                    stickyFirstColumn && idx === 0 && "sticky left-0 bg-card",
                    col.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                        active && "text-foreground",
                        col.align === "right" && "ml-auto",
                      )}
                    >
                      <span>{col.label}</span>
                      {active ? (
                        sortDir === "desc" ? (
                          <ChevronDownGlyph className="size-3" />
                        ) : (
                          <ChevronUpGlyph className="size-3" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const rank = index + 1;
            const isSpotlight = spotlightTop > 0 && rank <= spotlightTop;
            return (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border last:border-b-0",
                  isSpotlight &&
                    "bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]/40",
                  onRowClick &&
                    "cursor-pointer transition-colors hover:bg-muted/30",
                )}
              >
                <td className="py-3 pr-2 pl-4">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      isSpotlight
                        ? "bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {rank}
                  </span>
                </td>
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={cn(
                      "py-3 px-2",
                      col.align === "right" && "text-right tabular-nums",
                      stickyFirstColumn && idx === 0 && "sticky left-0 bg-card",
                      col.className,
                    )}
                  >
                    {col.render(row, rank)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Cell helpers ────────────────────────────────────────────────────────────
// Small primitives that columns can plug into render(). Keeps the table
// generic while making it trivial to compose bar-in-cell, sparklines, etc.

interface BarInCellProps {
  /** Current value. */
  value: number;
  /** Max in the column so bars share a scale. */
  max: number;
  /** Optional secondary value (e.g. target) drawn as a thin marker. */
  target?: number | null;
  tone?: "neutral" | "positive" | "warning" | "danger";
  className?: string;
}

/**
 * Bar-in-cell — fills a horizontal bar proportional to `value/max`. Tone is
 * driven by `value/target` if target is provided (green ≥90%, amber ≥70%,
 * red below). Reuses semantic tokens so it stays in sync with the rest of
 * the manager surface.
 */
export function BarInCell({
  value,
  max,
  target,
  tone,
  className,
}: BarInCellProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const attainment = target && target > 0 ? value / target : null;
  const resolvedTone =
    tone ??
    (attainment != null
      ? attainment >= 0.9
        ? "positive"
        : attainment >= 0.7
          ? "warning"
          : "danger"
      : "neutral");

  const fill =
    resolvedTone === "positive"
      ? "bg-success"
      : resolvedTone === "warning"
        ? "bg-[var(--color-warning,oklch(0.75_0.15_65))]"
        : resolvedTone === "danger"
          ? "bg-destructive"
          : "bg-[color:var(--ba-accent)]";

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${pct}%` }}
      />
      {target != null && max > 0 ? (
        <div
          aria-hidden
          className="absolute top-0 h-full w-px bg-foreground/40"
          style={{ left: `${Math.min(100, (target / max) * 100)}%` }}
        />
      ) : null}
    </div>
  );
}

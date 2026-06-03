import * as React from "react";
import { cn } from "@/lib/utils";

export interface SavedView {
  id: string;
  label: string;
}

interface DataTableShellProps {
  /** Headline (e.g. "Clientes"). */
  title?: string;
  /** Row count summary ("2,481 clientes"). */
  summary?: React.ReactNode;
  /** Search input (controlled by the parent). */
  search?: React.ReactNode;
  /** Saved views — rendered as tab-style pills. */
  views?: SavedView[];
  activeViewId?: string;
  onViewChange?: (id: string) => void;
  /** Top-right toolbar (Export, configure columns, etc.). */
  toolbar?: React.ReactNode;
  /** The actual data table (children). */
  children: React.ReactNode;
  /** Floating bulk-action bar, rendered absolute at the bottom when present. */
  bulkActions?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper around a DataTable that adds the moving parts every exportable list
 * needs: search, saved-views tabs, toolbar (export / configure columns), and a
 * floating bulk-actions bar at the bottom when rows are selected.
 *
 * The shell is dumb — the parent owns the data and the selection state. This
 * keeps the SRP clean and lets the same shell host customers, BAs, stores, etc.
 */
export function DataTableShell({
  title,
  summary,
  search,
  views,
  activeViewId,
  onViewChange,
  toolbar,
  children,
  bulkActions,
  className,
}: DataTableShellProps) {
  return (
    <section className={cn("relative flex flex-col gap-3", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          {title ? (
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          ) : null}
          {summary ? (
            <span className="text-sm text-muted-foreground">{summary}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {search}
          {toolbar}
        </div>
      </header>

      {views && views.length > 0 ? (
        <nav
          aria-label="Vistas guardadas"
          className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2"
        >
          {views.map((v) => {
            const active = v.id === activeViewId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onViewChange?.(v.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      <div className="rounded-xl border border-border bg-card">{children}</div>

      {bulkActions ? (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-md">
            {bulkActions}
          </div>
        </div>
      ) : null}
    </section>
  );
}

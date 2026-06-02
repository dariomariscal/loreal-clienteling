"use client";

import { cn } from "@/lib/utils";
import { SCAN_ACTION_VISUAL } from "./scan-vocabulary";
import type { ScanActionType } from "@loreal/contracts";

interface ScanActionRowProps {
  actions: Array<{ type: ScanActionType; label?: string }>;
  /** Disabled while a sibling mutation is in flight to prevent double-fires. */
  disabled?: boolean;
  onSelect: (type: ScanActionType) => void;
  className?: string;
}

/**
 * Horizontal row of outlined icon+label chips for the scan sheet's secondary
 * actions (sample, wishlist, share, etc). The primary action (Add to cart)
 * is rendered separately as a full-width CTA by the sheet — chips here are
 * the Endear / Salesfloor pattern: discoverable, one-handed, fire-and-forget.
 *
 * The `actions` array preserves the priority order returned by the lookup
 * endpoint. We render every action passed in — filtering belongs upstream
 * (the API decides what's applicable; the UI just renders it).
 */
export function ScanActionRow({
  actions,
  disabled,
  onSelect,
  className,
}: ScanActionRowProps) {
  if (actions.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Acciones rápidas"
    >
      {actions.map(({ type, label }) => {
        const visual = SCAN_ACTION_VISUAL[type];
        if (!visual) return null;
        const Icon = visual.Icon;
        return (
          <li key={type}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(type)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Icon className="size-3.5 text-[color:var(--ba-accent)]" />
              <span>{label ?? visual.shortLabel}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

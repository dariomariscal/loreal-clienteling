"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckGlyph } from "@/components/ui/glyphs";

type SelectableCardVariant = "single" | "multi" | "toggle";

interface SelectableCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  variant?: SelectableCardVariant;
  selected: boolean;
  onSelect: (next: boolean) => void;
  icon?: React.ReactNode;
  label: React.ReactNode;
  helper?: React.ReactNode;
  /** Hex/oklch color shown as a small swatch in the top-right (for shade cards). */
  swatch?: string;
}

/**
 * Tappable card representing a choice. Three variants:
 *   - `single` — exclusive choice within a group (radio semantics)
 *   - `multi`  — any number can be active (checkbox semantics)
 *   - `toggle` — single card on/off
 *
 * The component is uncontrolled-by-default in the parent's sense: pass
 * `selected` and `onSelect`. The visual treatment is shared across variants;
 * only the implicit ARIA role differs.
 *
 * Styling follows the Linear/Notion convention: subtle ring + 5% brand wash
 * when selected, no heavy borders, no busy shadows.
 */
export function SelectableCard({
  variant = "single",
  selected,
  onSelect,
  icon,
  label,
  helper,
  swatch,
  className,
  disabled,
  ...rest
}: SelectableCardProps) {
  const role =
    variant === "single" ? "radio" : variant === "multi" ? "checkbox" : "switch";

  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={() => !disabled && onSelect(!selected)}
      data-state={selected ? "on" : "off"}
      className={cn(
        // base
        "group relative flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-xl border bg-card px-3 py-3 text-center text-sm transition-all duration-150",
        // border / surface
        "border-input hover:bg-muted/50",
        // selected
        "data-[state=on]:border-primary data-[state=on]:bg-primary/4 data-[state=on]:ring-2 data-[state=on]:ring-primary/20",
        // focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        // disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {swatch ? (
        <span
          aria-hidden
          className="absolute top-2 right-2 size-3 rounded-full ring-1 ring-foreground/10"
          style={{ backgroundColor: swatch }}
        />
      ) : null}

      {selected && variant !== "toggle" ? (
        <span
          aria-hidden
          className="absolute top-2 left-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <CheckGlyph className="size-3" />
        </span>
      ) : null}

      {icon ? (
        <span className="text-muted-foreground transition-colors group-data-[state=on]:text-foreground">
          {icon}
        </span>
      ) : null}

      <span className="font-medium leading-tight text-foreground">{label}</span>

      {helper ? (
        <span className="text-xs leading-tight text-muted-foreground">
          {helper}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Convenience grid container — keeps every selectable grid identical without
 * forcing callers to remember the column counts. Pass `columns={3 | 4 | 5}`.
 */
export function SelectableCardGrid({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4 | 5;
  className?: string;
  children: React.ReactNode;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <div role="group" className={cn("grid gap-2.5", gridCols, className)}>
      {children}
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SparkleDotGlyph } from "@/components/ui/glyphs";

export type InboxFilter = "all" | "unread" | "drafts";

interface InboxFilterChipsProps {
  value: InboxFilter;
  onChange: (next: InboxFilter) => void;
  counts: Partial<Record<InboxFilter, number>>;
  className?: string;
}

// VISUAL DEVICE: text chips with underline indicator. NOT pill tabs.
//
// Linear/Front pattern: chips read as labels, the active one carries a
// 2px underline in accent. No filled pill, no card background — chrome
// is too loud for a filter that exists permanently on the screen.
// Counters appear inline in muted as `Sin leer 12`.
export function InboxFilterChips({
  value,
  onChange,
  counts,
  className,
}: InboxFilterChipsProps) {
  return (
    <nav
      role="tablist"
      aria-label="Filtros de bandeja"
      className={cn("flex items-center gap-6", className)}
    >
      <Chip
        active={value === "all"}
        onClick={() => onChange("all")}
        label="Todas"
        count={counts.all}
      />
      <Chip
        active={value === "unread"}
        onClick={() => onChange("unread")}
        label="Sin leer"
        count={counts.unread}
      />
      <Chip
        active={value === "drafts"}
        onClick={() => onChange("drafts")}
        label="Borradores IA"
        glyph={<SparkleDotGlyph className="size-3 text-[var(--ba-accent)]" />}
        count={counts.drafts}
      />
    </nav>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  glyph,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  glyph?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 pb-2 text-[13px] transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground/80",
      )}
    >
      {glyph}
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-muted-foreground" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      ) : null}
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--ba-accent)]"
        />
      ) : null}
    </button>
  );
}

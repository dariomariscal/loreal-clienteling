"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SparkleDotGlyph } from "@/components/ui/glyphs";

interface AISuggestionChipProps {
  text: string;
  rationale?: string;
  onSelect: () => void;
  className?: string;
}

// VISUAL DEVICE: pill. Horizontal, low-chrome.
//
// Used as the strip of 3 message suggestions above the conversation
// input. Pills (not cards, not list items) because the action is
// fast: tap → drop into the input → edit → send. The sparkle dot is
// the only AI signifier.
//
// Rationale shown as title attribute (tooltip) — Explainable Rationale
// without occupying screen space. Hover reveals it; tap consumes.
export function AISuggestionChip({
  text,
  rationale,
  onSelect,
  className,
}: AISuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={rationale}
      className={cn(
        "inline-flex max-w-[280px] items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-left",
        "text-[12.5px] text-foreground transition-all duration-150",
        "hover:border-[var(--ba-accent)]/40 hover:bg-[var(--ba-accent-soft)]/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ba-accent)]/30",
        className,
      )}
    >
      <SparkleDotGlyph className="size-3 shrink-0 text-[var(--ba-accent)]" />
      <span className="truncate">{text}</span>
    </button>
  );
}

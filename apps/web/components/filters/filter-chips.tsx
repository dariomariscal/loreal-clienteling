"use client";

import * as React from "react";
import { CloseGlyph } from "@/components/ui/glyphs";
import { useFilters } from "@/lib/filters/use-filters";
import type { FilterKey } from "@/lib/filters/filter-types";

interface ActiveChip {
  key: FilterKey;
  label: string;
}

interface FilterChipsProps {
  /** Map a filter key to a label resolver. */
  labelFor: Partial<Record<FilterKey, (value: string) => string>>;
  /** Filter keys to ignore (e.g. `from`/`to` are usually shown by the date picker). */
  ignore?: FilterKey[];
}

const ALWAYS_HIDDEN: FilterKey[] = ["from", "to", "preset", "compare"];

/**
 * Active-filter chips bar — Linear pattern. Renders one dismissible chip per
 * filter that has a value (excluding date pickers, which already render their
 * own control). "Clear all" appears when ≥2 chips are visible.
 */
export function FilterChips({ labelFor, ignore = [] }: FilterChipsProps) {
  const { filters, clearFilter, clearAll } = useFilters();

  const hidden = new Set<FilterKey>([...ALWAYS_HIDDEN, ...ignore]);
  const chips: ActiveChip[] = [];

  for (const [key, value] of Object.entries(filters) as Array<
    [FilterKey, unknown]
  >) {
    if (hidden.has(key)) continue;
    if (value == null || value === "" || value === false) continue;
    const resolver = labelFor[key];
    chips.push({
      key,
      label: resolver ? resolver(String(value)) : String(value),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => clearFilter(c.key)}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          <span>{c.label}</span>
          <CloseGlyph className="size-3 opacity-60" aria-hidden />
          <span className="sr-only">Quitar filtro</span>
        </button>
      ))}
      {chips.length >= 2 ? (
        <button
          type="button"
          onClick={clearAll}
          className="ml-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Limpiar todo
        </button>
      ) : null}
    </div>
  );
}

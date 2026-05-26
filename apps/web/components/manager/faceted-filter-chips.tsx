"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckGlyph,
  ChevronDownGlyph,
  CloseGlyph,
} from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
  /** Optional helper line shown under the label inside the popover. */
  hint?: string;
}

export interface Facet {
  /** URL param name — drives the searchParams sync. */
  key: string;
  /** Label of the chip ("Zona", "Marca", "Performance"). */
  label: string;
  options: FacetOption[];
}

interface FacetedFilterChipsProps {
  facets: Facet[];
  /**
   * Optional controlled value map { facetKey → selectedValues[] }. When
   * omitted, the component reads + writes URL search params directly.
   */
  value?: Record<string, string[]>;
  onChange?: (next: Record<string, string[]>) => void;
  className?: string;
}

/**
 * Linear/shadcn-style faceted filter row. One chip per facet; tapping a
 * chip opens a popover with a multi-select list. Selected values are stored
 * in the URL as comma-separated params (`?zone=norte,bajio`) so the filter
 * state is bookmarkable and shareable — best practice from Vercel/Linear
 * 2026 data table patterns.
 *
 * Designed to be used above any list/table. Returns the parsed value map
 * via the optional `value` + `onChange` props OR, when uncontrolled, owns
 * its URL-syncing internally.
 */
export function FacetedFilterChips({
  facets,
  value: controlledValue,
  onChange: controlledOnChange,
  className,
}: FacetedFilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isControlled = controlledValue !== undefined;

  const value: Record<string, string[]> = React.useMemo(() => {
    if (isControlled) return controlledValue ?? {};
    const map: Record<string, string[]> = {};
    for (const facet of facets) {
      const raw = searchParams.get(facet.key);
      map[facet.key] = raw ? raw.split(",").filter(Boolean) : [];
    }
    return map;
    // controlled path reads directly; uncontrolled depends on URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, controlledValue, searchParams, facets]);

  const setFacet = React.useCallback(
    (key: string, next: string[]) => {
      const merged = { ...value, [key]: next };
      if (controlledOnChange) {
        controlledOnChange(merged);
        return;
      }
      if (!isControlled) {
        const sp = new URLSearchParams(searchParams.toString());
        if (next.length === 0) sp.delete(key);
        else sp.set(key, next.join(","));
        const qs = sp.toString();
        router.replace(qs ? `?${qs}` : "?", { scroll: false });
      }
    },
    [value, controlledOnChange, isControlled, searchParams, router],
  );

  const activeCount = facets.reduce(
    (sum, f) => sum + (value[f.key]?.length ?? 0),
    0,
  );

  function clearAll() {
    if (controlledOnChange) {
      controlledOnChange(Object.fromEntries(facets.map((f) => [f.key, []])));
      return;
    }
    if (!isControlled) {
      const sp = new URLSearchParams(searchParams.toString());
      for (const f of facets) sp.delete(f.key);
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {facets.map((facet) => (
        <FacetChip
          key={facet.key}
          facet={facet}
          selected={value[facet.key] ?? []}
          onChange={(next) => setFacet(facet.key, next)}
        />
      ))}
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <CloseGlyph className="size-3" />
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}

function FacetChip({
  facet,
  selected,
  onChange,
}: {
  facet: Facet;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [search, setSearch] = React.useState("");
  const filtered = React.useMemo(
    () =>
      facet.options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [facet.options, search],
  );

  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v));
    else onChange([...selected, v]);
  }

  const hasSelection = selected.length > 0;

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none",
          hasSelection
            ? "border-foreground/15 bg-foreground text-background"
            : "border-border bg-card text-foreground hover:bg-muted/40",
        )}
      >
        <span>{facet.label}</span>
        {hasSelection ? (
          <span
            className={cn(
              "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
              hasSelection
                ? "bg-background/20 text-background"
                : "bg-muted text-muted-foreground",
            )}
          >
            {selected.length}
          </span>
        ) : (
          <ChevronDownGlyph className="size-3 opacity-70" />
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="z-50">
          <Popover.Popup className="w-64 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg ring-1 ring-foreground/6 outline-none">
            <div className="border-b border-border/60 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Buscar ${facet.label.toLowerCase()}…`}
                className="h-8 w-full rounded-lg bg-muted/40 px-2.5 text-sm outline-none focus-visible:bg-muted/60"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Sin opciones
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = selected.includes(opt.value);
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                        isSelected && "bg-muted/60",
                      )}
                    >
                      <span className="mt-0.5 flex size-4 items-center justify-center">
                        {isSelected ? <CheckGlyph className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{opt.label}</span>
                        {opt.hint ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {opt.hint}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {selected.length > 0 ? (
              <div className="border-t border-border/60 p-1.5">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                >
                  Quitar selección
                </button>
              </div>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

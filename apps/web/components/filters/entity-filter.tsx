"use client";

import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useFilters } from "@/lib/filters/use-filters";
import type { FilterKey } from "@/lib/filters/filter-types";

export interface EntityOption {
  id: string;
  label: string;
}

interface EntityFilterProps {
  /** Filter key in URL — e.g. "storeId" | "baUserId" | "brandId" | "banner" | "zoneId". */
  filterKey: FilterKey;
  /** Placeholder when no value is selected — e.g. "Todas las tiendas". */
  placeholder: string;
  /** Options. Pass `undefined` while loading to keep the control disabled. */
  options?: EntityOption[];
  ariaLabel?: string;
}

/**
 * Generic single-value filter. The DRY answer to "we need a dropdown for X" —
 * tienda, BA, marca, banner, zona all use this same component. Behaviour is
 * identical; only the filterKey + options change.
 */
export function EntityFilter({
  filterKey,
  placeholder,
  options,
  ariaLabel,
}: EntityFilterProps) {
  const { filters, setFilter } = useFilters();
  const value = filters[filterKey];
  const isLoading = options == null;

  const rawValue = typeof value === "string" ? value : "";
  // Base UI's <SelectValue> prints the raw `value` when no <SelectItem> matches
  // (e.g. options still loading, or the URL carries an id that's no longer in
  // the list). Coerce to "" so the placeholder is shown instead of a UUID.
  const matchedOption = options?.find((opt) => opt.id === rawValue);
  const safeValue = matchedOption ? rawValue : "";

  return (
    <Select
      value={safeValue}
      onValueChange={(next: unknown) =>
        setFilter(filterKey, (next as string) || undefined)
      }
      disabled={isLoading}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel ?? placeholder}>
        <SelectValue placeholder={placeholder}>
          {matchedOption?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options?.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

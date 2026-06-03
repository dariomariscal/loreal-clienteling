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

  return (
    <Select
      value={typeof value === "string" ? value : ""}
      onValueChange={(next: unknown) =>
        setFilter(filterKey, (next as string) || undefined)
      }
      disabled={isLoading}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel ?? placeholder}>
        <SelectValue placeholder={placeholder} />
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

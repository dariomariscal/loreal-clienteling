"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "./date-range-picker";
import { FilterChips } from "./filter-chips";
import type { FilterKey } from "@/lib/filters/filter-types";
import { ROLE_FILTER_KEYS } from "@/lib/filters/filter-types";

interface FilterBarProps {
  /** Caller's role — controls which filter slots are rendered (progressive disclosure). */
  role: keyof typeof ROLE_FILTER_KEYS | string;
  /**
   * Entity filter components to render (e.g. EntityFilter for tienda/BA/etc.).
   * The bar decides which ones to keep based on the role's allowed keys.
   * Each child must declare its `data-filter-key` attribute so the bar can
   * filter it; alternatively pass a `slots` map keyed by FilterKey.
   */
  slots?: Partial<Record<FilterKey, React.ReactNode>>;
  /** Label resolvers for FilterChips. */
  chipLabels?: Partial<Record<FilterKey, (value: string) => string>>;
  className?: string;
}

/**
 * The single filter bar used by every report. Order matters: date first, then
 * entity filters in the order declared by ROLE_FILTER_KEYS, then chips below.
 *
 * Progressive disclosure: a slot is rendered only when the role can use it.
 * For example beauty_advisor renders only the date picker — store/banner/brand
 * dropdowns are omitted (not greyed out).
 */
export function FilterBar({
  role,
  slots = {},
  chipLabels = {},
  className,
}: FilterBarProps) {
  const allowedKeys = ROLE_FILTER_KEYS[role] ?? ROLE_FILTER_KEYS.admin;
  const showDate = allowedKeys.includes("from");

  // Render any provided slot whose key is in allowedKeys, preserving the
  // role's declared order so the bar layout is consistent across reports.
  const entitySlots = allowedKeys
    .filter((k) => k !== "from" && k !== "to" && k !== "preset" && k !== "compare")
    .map((key) => {
      const node = slots[key];
      if (!node) return null;
      return (
        <React.Fragment key={key}>{node}</React.Fragment>
      );
    })
    .filter(Boolean);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showDate ? <DateRangePicker /> : null}
      {entitySlots}
      <div className="ml-auto">
        <FilterChips labelFor={chipLabels} />
      </div>
    </div>
  );
}

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

/**
 * Date range picker — preset dropdown only (custom range deferred to a follow-up
 * iteration that brings a calendar component). Single control covers 95% of the
 * use case across all 6 reports.
 *
 * Reads/writes the active preset through `useFilters` so the URL stays in
 * sync. The "from"/"to" pair is computed from the preset on apply.
 */
export function DateRangePicker() {
  const { filters, presets, applyPreset } = useFilters();

  return (
    <Select
      value={filters.preset ?? "30d"}
      onValueChange={(value: unknown) =>
        applyPreset(value as typeof filters.preset)
      }
    >
      <SelectTrigger size="sm" aria-label="Rango de fechas">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

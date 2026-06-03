"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DATE_RANGE_PRESETS,
  DEFAULT_PRESET_ID,
  getPresetById,
} from "./date-range-presets";
import type { FilterKey, ReportFilters } from "./filter-types";

const FILTER_KEYS: FilterKey[] = [
  "from",
  "to",
  "preset",
  "compare",
  "banner",
  "storeId",
  "brandId",
  "baUserId",
  "zoneId",
];

/**
 * useFilters — single source of truth for every report filter.
 *
 * State lives in the URL (`?from=...&banner=...`) so reports are shareable
 * and survive refresh. Anywhere in the page you can:
 *   const { filters, setFilter, clearFilter, clearAll } = useFilters();
 *
 * Default behaviour: if `from`/`to`/`preset` are missing on first render the
 * hook substitutes a sensible default (last 30 days) without writing to the
 * URL — so a fresh page doesn't get a 30-key URL on load.
 */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = React.useMemo<ReportFilters>(() => {
    const presetId = searchParams.get("preset") ?? DEFAULT_PRESET_ID;
    const preset = getPresetById(presetId);
    const fallback =
      preset && presetId !== "custom" ? preset.resolve() : undefined;

    return {
      from: searchParams.get("from") ?? fallback?.from,
      to: searchParams.get("to") ?? fallback?.to,
      preset: (searchParams.get("preset") as ReportFilters["preset"]) ??
        DEFAULT_PRESET_ID,
      compare: searchParams.get("compare") === "true",
      banner: searchParams.get("banner") ?? undefined,
      storeId: searchParams.get("storeId") ?? undefined,
      brandId: searchParams.get("brandId") ?? undefined,
      baUserId: searchParams.get("baUserId") ?? undefined,
      zoneId: searchParams.get("zoneId") ?? undefined,
    };
  }, [searchParams]);

  const writeParams = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setFilter = React.useCallback(
    <K extends FilterKey>(key: K, value: ReportFilters[K]) => {
      writeParams((params) => {
        if (value == null || value === "" || value === false) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
    },
    [writeParams],
  );

  const setMany = React.useCallback(
    (next: Partial<ReportFilters>) => {
      writeParams((params) => {
        for (const [k, v] of Object.entries(next)) {
          if (v == null || v === "" || v === false) {
            params.delete(k);
          } else {
            params.set(k, String(v));
          }
        }
      });
    },
    [writeParams],
  );

  const clearFilter = React.useCallback(
    (key: FilterKey) => {
      writeParams((params) => params.delete(key));
    },
    [writeParams],
  );

  const clearAll = React.useCallback(() => {
    writeParams((params) => {
      for (const k of FILTER_KEYS) params.delete(k);
    });
  }, [writeParams]);

  /**
   * Apply a preset: resolves the (from, to) pair and writes both + the preset
   * id atomically so the URL stays consistent.
   */
  const applyPreset = React.useCallback(
    (presetId: ReportFilters["preset"]) => {
      const preset = getPresetById(presetId);
      if (!preset || presetId === "custom") {
        setFilter("preset", presetId);
        return;
      }
      const { from, to } = preset.resolve();
      setMany({ preset: presetId, from, to });
    },
    [setFilter, setMany],
  );

  return {
    filters,
    setFilter,
    setMany,
    clearFilter,
    clearAll,
    applyPreset,
    presets: DATE_RANGE_PRESETS,
  };
}

import { sql, type Column, type SQL } from "drizzle-orm";
import type { DateRange } from "./analytics-date.util";

/**
 * The full filter set every analytics service method accepts. Extends DateRange
 * because date filtering is universal; the entity slots are optional and only
 * applied when the caller's role allows them (the controller is responsible
 * for the role check; services just AND them into the WHERE).
 */
export interface ReportFiltersInput extends DateRange {
  banner?: string;
  brandId?: string;
  storeId?: string;
  baUserId?: string;
  zoneId?: string;
}

/**
 * Splits a ReportFiltersInput into its DateRange portion and its entity
 * filters portion. Useful for service methods that already accept a DateRange
 * and want to keep that API while still receiving the new filters.
 */
export function splitFilters(input: ReportFiltersInput | undefined): {
  range: DateRange | undefined;
  filters: Omit<ReportFiltersInput, "from" | "to">;
} {
  if (!input) return { range: undefined, filters: {} };
  const { from, to, ...filters } = input;
  return {
    range: from || to ? { from, to } : undefined,
    filters,
  };
}

/**
 * Builds an optional equality filter for a column when the corresponding
 * filter value is set. Returns `undefined` when the value is empty so callers
 * can spread it into a conditions array with `if (cond) conditions.push(cond)`.
 *
 * Reused by every analytics service so the WHERE-building stays DRY across
 * dashboard, performance, sales, zone, appointments, and targets queries.
 */
export function buildEntityEqFilter(
  value: string | undefined,
  column: Column,
): SQL | undefined {
  if (!value) return undefined;
  return sql`${column} = ${value}`;
}

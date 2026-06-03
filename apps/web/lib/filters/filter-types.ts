/**
 * Shared filter shape for every report page.
 *
 * Filters live in URL search params so a manager can paste a report URL into
 * Slack/WhatsApp and the receiver sees the same view. The keys here are the
 * exact `searchParams` names — keep them stable.
 *
 * Roles see a subset of these (progressive disclosure):
 *   beauty_advisor          → date only
 *   counter_manager         → date + ba
 *   area_manager            → date + ba + store + banner + brand
 *   national_retail_manager → date + ba + store + banner + brand + zone
 *   admin                   → everything
 */
export interface ReportFilters {
  /** ISO date YYYY-MM-DD. */
  from?: string;
  /** ISO date YYYY-MM-DD. */
  to?: string;
  /** Preset id when not custom — drives the date label in the chip. */
  preset?: DateRangePresetId;
  /** When true the comparison vs previous period is enabled. */
  compare?: boolean;
  /** Filter to one banner code (e.g. "liverpool" | "palacio"). */
  banner?: string;
  /** Filter to one storeId. */
  storeId?: string;
  /** Filter to one brandId. */
  brandId?: string;
  /** Filter to one BA / user id (Clerk id). */
  baUserId?: string;
  /** Filter to one zoneId (national role mostly). */
  zoneId?: string;
}

export type FilterKey = keyof ReportFilters;

/**
 * Which filters a given role can see. The order matches the order they render
 * in the filter bar.
 */
export const ROLE_FILTER_KEYS: Record<string, FilterKey[]> = {
  beauty_advisor: ["from", "to", "preset", "compare"],
  counter_manager: ["from", "to", "preset", "compare", "baUserId"],
  area_manager: [
    "from",
    "to",
    "preset",
    "compare",
    "banner",
    "storeId",
    "brandId",
    "baUserId",
  ],
  national_retail_manager: [
    "from",
    "to",
    "preset",
    "compare",
    "zoneId",
    "banner",
    "storeId",
    "brandId",
    "baUserId",
  ],
  admin: [
    "from",
    "to",
    "preset",
    "compare",
    "zoneId",
    "banner",
    "storeId",
    "brandId",
    "baUserId",
  ],
};

export type DateRangePresetId =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "custom";

export interface DateRangePreset {
  id: DateRangePresetId;
  label: string;
  /** Resolves to (from, to) ISO dates in local time. */
  resolve: (now?: Date) => { from: string; to: string };
}

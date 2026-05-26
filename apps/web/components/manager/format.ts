/**
 * Compact MXN formatter for KPI cards and ranking tables. Long-form names
 * ("$1,234,567.89") don't fit in dense layouts — manager screens trade
 * precision for scanability ("$1.2M", "$45.3k") and progressive disclosure
 * to detail screens for the exact figure.
 */
export function formatCompactMoney(
  value: number | string | null | undefined,
  currency: string = "MXN",
): string {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(num)) return "—";
  if (num === 0) return "$0";

  const abs = Math.abs(num);
  let formatted: string;
  if (abs >= 1_000_000) {
    formatted = `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 1 : 2)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
  } else {
    formatted = num.toFixed(0);
  }

  return currency === "MXN" ? `$${formatted}` : `${formatted} ${currency}`;
}

/** Compact integer formatter — used for orders, customers, etc. */
export function formatCompactNumber(value: number | null | undefined): string {
  const num = value ?? 0;
  if (!Number.isFinite(num)) return "—";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
  return String(num);
}

/** Percentage with explicit sign, used for delta chips. */
export function formatDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

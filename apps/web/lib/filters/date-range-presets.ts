import type { DateRangePreset } from "./filter-types";

function toISO(d: Date): string {
  // Local-date YYYY-MM-DD (no time, no UTC drift).
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfQuarter(d: Date): Date {
  const month = d.getMonth();
  const quarterStartMonth = month - (month % 3);
  return new Date(d.getFullYear(), quarterStartMonth, 1);
}

/**
 * Single source of truth for date range presets. Used by the date picker, the
 * filter chip label, and tests. Stripe / Linear convention: "today" through
 * "this quarter" + custom.
 */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "today",
    label: "Hoy",
    resolve: (now = new Date()) => ({
      from: toISO(startOfDay(now)),
      to: toISO(startOfDay(now)),
    }),
  },
  {
    id: "yesterday",
    label: "Ayer",
    resolve: (now = new Date()) => {
      const y = addDays(startOfDay(now), -1);
      return { from: toISO(y), to: toISO(y) };
    },
  },
  {
    id: "7d",
    label: "Últimos 7 días",
    resolve: (now = new Date()) => ({
      from: toISO(addDays(startOfDay(now), -6)),
      to: toISO(startOfDay(now)),
    }),
  },
  {
    id: "30d",
    label: "Últimos 30 días",
    resolve: (now = new Date()) => ({
      from: toISO(addDays(startOfDay(now), -29)),
      to: toISO(startOfDay(now)),
    }),
  },
  {
    id: "this_month",
    label: "Este mes",
    resolve: (now = new Date()) => ({
      from: toISO(startOfMonth(now)),
      to: toISO(endOfMonth(now)),
    }),
  },
  {
    id: "last_month",
    label: "Mes pasado",
    resolve: (now = new Date()) => {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        from: toISO(startOfMonth(lastMonth)),
        to: toISO(endOfMonth(lastMonth)),
      };
    },
  },
  {
    id: "this_quarter",
    label: "Este trimestre",
    resolve: (now = new Date()) => {
      const start = startOfQuarter(now);
      const end = endOfMonth(addDays(start, 60)); // Always Q-end month.
      return { from: toISO(start), to: toISO(end) };
    },
  },
];

export function getPresetById(id: string | undefined) {
  return DATE_RANGE_PRESETS.find((p) => p.id === id);
}

export const DEFAULT_PRESET_ID: DateRangePreset["id"] = "30d";

export interface DayInfo {
  iso: string;
  date: Date;
  available: boolean;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function buildDayStrip(
  fromIso: string,
  count: number,
  availability: { date: string; hasAvailability: boolean }[],
): DayInfo[] {
  const availMap = new Map(availability.map((d) => [d.date, d.hasAvailability]));
  const [y, m, d] = fromIso.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(base, i);
    const iso = toISODate(date);
    return {
      iso,
      date,
      // Optimistically allow days until availability loads — once it lands,
      // days without slots dim without flicker.
      available: availMap.get(iso) ?? true,
    };
  });
}

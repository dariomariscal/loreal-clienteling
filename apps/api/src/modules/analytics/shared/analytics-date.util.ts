export interface DateRange {
  from?: Date;
  to?: Date;
}

/**
 * Defaults the range to "month-to-date": `to` = now, `from` = first day of
 * the current month (UTC midnight). Used by most analytics queries.
 */
export function getDefaultDateRange(range?: DateRange): {
  from: Date;
  to: Date;
} {
  const to = range?.to ?? new Date();
  const from =
    range?.from ??
    (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
  return { from, to };
}

/**
 * Default range used by trend queries that want a longer rolling window
 * regardless of the calendar month: last 6 months from today, snapped to
 * the first of that month.
 */
export function getTrendDefaultDateRange(range?: DateRange): {
  from: Date;
  to: Date;
} {
  const to = range?.to ?? new Date();
  const from =
    range?.from ??
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
  return { from, to };
}

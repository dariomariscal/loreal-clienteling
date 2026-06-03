import * as React from "react";
import { cn } from "@/lib/utils";

interface KpiStripProps {
  /** KpiCard nodes (typically 2-6). */
  children: React.ReactNode;
  /**
   * How many columns at lg breakpoint. Tablet portrait collapses to 2,
   * mobile to 1. Default 4 (Vercel convention for executive dashboards).
   */
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const COL_CLS: Record<NonNullable<KpiStripProps["columns"]>, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * Strip of KPI cards. Owns the responsive grid — children stay agnostic.
 * Mobile: 1col · Tablet portrait: 2col · Desktop: configurable up to 6.
 */
export function KpiStrip({ children, columns = 4, className }: KpiStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        COL_CLS[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

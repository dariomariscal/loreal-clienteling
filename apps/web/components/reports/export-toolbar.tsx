"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useAnalyticsExport } from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

export type ExportType =
  | "customers"
  | "sales"
  | "appointments"
  | "agenda-report"
  | "ba-performance"
  | "stores-ranking"
  | "banners-ranking"
  | "sales-trend"
  | "sales-breakdown";

interface ExportToolbarProps {
  /** Backend export type — drives which rows /analytics/export returns. */
  type: ExportType;
  /** Disable both buttons (e.g. while loading / no rows). */
  disabled?: boolean;
}

/**
 * Shared CSV / XLSX export buttons for analytics reports. Reads the current
 * filter bar state (URL search params) via useFilters so the download reflects
 * exactly what the user sees on screen.
 */
export function ExportToolbar({ type, disabled }: ExportToolbarProps) {
  const { filters } = useFilters();
  const exportMut = useAnalyticsExport();

  const onExport = (format: "csv" | "xlsx") => {
    exportMut.mutate({
      type,
      format,
      from: filters.from,
      to: filters.to,
      banner: filters.banner,
      brandId: filters.brandId,
      storeId: filters.storeId,
      baUserId: filters.baUserId,
      zoneId: filters.zoneId,
    });
  };

  const isDisabled = disabled || exportMut.isPending;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isDisabled}
        onClick={() => onExport("csv")}
      >
        {exportMut.isPending ? "Exportando…" : "Exportar CSV"}
      </Button>
      <Button
        size="sm"
        disabled={isDisabled}
        onClick={() => onExport("xlsx")}
      >
        Exportar Excel
      </Button>
    </div>
  );
}

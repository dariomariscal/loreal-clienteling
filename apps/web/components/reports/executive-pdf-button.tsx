"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/lib/filters/use-filters";

interface ExecutivePdfButtonProps {
  /** Scope label printed on the cover and headers ("Nacional", "Zona Centro"). */
  scopeLabel: string;
  /** Optional recipient name — printed on the cover + every footer. */
  recipientName?: string;
}

/**
 * Opens /reports/executive in a new tab with the current filter state and
 * auto-triggers window.print() once the brief is ready. The user picks
 * "Guardar como PDF" in the native print dialog and gets a clean briefing.
 */
export function ExecutivePdfButton({
  scopeLabel,
  recipientName,
}: ExecutivePdfButtonProps) {
  const { filters } = useFilters();

  const onClick = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.banner) params.set("banner", filters.banner);
    if (filters.brandId) params.set("brandId", filters.brandId);
    if (filters.storeId) params.set("storeId", filters.storeId);
    if (filters.baUserId) params.set("baUserId", filters.baUserId);
    if (filters.zoneId) params.set("zoneId", filters.zoneId);
    params.set("scope", scopeLabel);
    if (recipientName) params.set("recipient", recipientName);

    window.open(`/reports/executive?${params.toString()}`, "_blank", "noopener");
  };

  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      Ver reporte ejecutivo
    </Button>
  );
}

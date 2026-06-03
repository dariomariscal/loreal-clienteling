"use client";

import { CustomersReport } from "@/components/reports";
import { AreaManagerFilterBar } from "@/components/filters";

/**
 * Report 4 — exportable customer list for the Area Manager. Backend scopes
 * to the zone automatically; filters allow narrowing by banner/store/brand/BA.
 */
export function AreaCustomersReport() {
  return (
    <CustomersReport
      role="area_manager"
      title="Clientes"
      description="Listado de tu zona con filtros por franquicia, tienda y BA"
      filterBar={<AreaManagerFilterBar />}
    />
  );
}

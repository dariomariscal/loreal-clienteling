"use client";

import { CustomersReport } from "@/components/reports";
import { FilterBar } from "@/components/filters";

/**
 * Report 4 — exportable customer list for the Counter Manager.
 * Scope (storeId + brandId) is applied automatically by the API via session.
 */
export function CounterCustomersReport() {
  return (
    <CustomersReport
      role="counter_manager"
      title="Clientes"
      description="Listado del mostrador con seguimientos próximos"
      filterBar={<FilterBar role="counter_manager" />}
    />
  );
}

"use client";

import { CustomersReport } from "@/components/reports";
import { NationalFilterBar } from "@/components/filters";

/**
 * Report 4 — exportable customer list for the National Retail Manager.
 * Scope: every store in the caller's division; filters allow narrowing by
 * banner, store, brand and BA.
 */
export function NationalCustomersReport() {
  return (
    <CustomersReport
      role="national_retail_manager"
      title="Clientes"
      description="Listado nacional de tu división"
      filterBar={<NationalFilterBar />}
    />
  );
}

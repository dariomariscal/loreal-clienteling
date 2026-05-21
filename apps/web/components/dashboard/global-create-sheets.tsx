"use client";

import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { BrandFormSheet } from "@/app/(dashboard)/marcas/_components/brand-form-sheet";
import { StoreFormSheet } from "@/app/(dashboard)/tiendas/_components/store-form-sheet";
import { CustomerRegistrationWizard } from "@/app/(dashboard)/clientes/_components/customer-registration-wizard";
import { AppointmentFormSheet } from "@/app/(dashboard)/agenda/_components/appointment-form-sheet";

/**
 * Mounts all "create" sheets globally so that the sidebar's "+ Create"
 * button can open any of them without page navigation. Each sheet is
 * controlled by the CreateMenuProvider context.
 */
export function GlobalCreateSheets() {
  const { openEntity, close } = useCreateMenu();

  return (
    <>
      <BrandFormSheet
        open={openEntity === "brand"}
        onOpenChange={(o) => !o && close()}
      />
      <StoreFormSheet
        open={openEntity === "store"}
        onOpenChange={(o) => !o && close()}
      />
      <CustomerRegistrationWizard
        open={openEntity === "customer"}
        onOpenChange={(o) => !o && close()}
      />
      <AppointmentFormSheet
        open={openEntity === "appointment"}
        onOpenChange={(o) => !o && close()}
      />
      {/* Product sheet — pending full-page refactor */}
    </>
  );
}

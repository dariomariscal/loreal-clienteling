"use client";

import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { BrandFormSheet } from "@/app/(dashboard)/marcas/_components/brand-form-sheet";
import { StoreFormSheet } from "@/app/(dashboard)/tiendas/_components/store-form-sheet";
import { CustomerRegistrationWizard } from "@/app/(dashboard)/clientes/_components/customer-registration-wizard";
import { AppointmentSheet } from "@/app/(dashboard)/clientes/[id]/_components/appointment/appointment-sheet";

interface GlobalCreateSheetsProps {
  /** Current user's id — needed by the appointment wizard to scope the
   * availability fetches to the right BA. */
  userId: string;
}

/**
 * Mounts all "create" sheets globally so that the sidebar's "+ Create"
 * button can open any of them without page navigation. Each sheet is
 * controlled by the CreateMenuProvider context.
 */
export function GlobalCreateSheets({ userId }: GlobalCreateSheetsProps) {
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
      <AppointmentSheet
        open={openEntity === "appointment"}
        onOpenChange={(o) => !o && close()}
        staffUserId={userId}
      />
      {/* Product sheet — pending full-page refactor */}
    </>
  );
}

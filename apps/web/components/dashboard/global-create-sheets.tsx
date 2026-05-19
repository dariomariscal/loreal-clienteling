"use client";

import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { BrandFormSheet } from "@/app/(dashboard)/marcas/_components/brand-form-sheet";
import { ZoneFormSheet } from "@/app/(dashboard)/zonas/_components/zone-form-sheet";
import { StoreFormSheet } from "@/app/(dashboard)/tiendas/_components/store-form-sheet";

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
      <ZoneFormSheet
        open={openEntity === "zone"}
        onOpenChange={(o) => !o && close()}
      />
      <StoreFormSheet
        open={openEntity === "store"}
        onOpenChange={(o) => !o && close()}
      />
      {/* User, Product, Customer, Appointment sheets — added in later steps */}
    </>
  );
}

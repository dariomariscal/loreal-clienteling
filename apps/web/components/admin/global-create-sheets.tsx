"use client";

import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { BrandFormSheet } from "@/app/(admin)/admin/marcas/_components/brand-form-sheet";
import { StoreFormSheet } from "@/app/(admin)/admin/tiendas/_components/store-form-sheet";

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
    </>
  );
}

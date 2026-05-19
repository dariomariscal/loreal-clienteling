"use client";

import {
  useCreateBrand,
  useUpdateBrand,
  useUpdateBrandConfig,
  useBrand,
  type Brand,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandForm, type BrandFormValues } from "./brand-form";

interface BrandFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
}

export function BrandFormSheet({ open, onOpenChange, brand }: BrandFormSheetProps) {
  const isEdit = Boolean(brand);
  const { data: brandDetail } = useBrand(brand?.id ?? "");
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const updateConfig = useUpdateBrandConfig();
  const isPending =
    createBrand.isPending || updateBrand.isPending || updateConfig.isPending;

  async function handleSubmit(data: BrandFormValues) {
    const { primaryColor, accentColor, ...brandData } = data;
    const hasColors = Boolean(primaryColor || accentColor);

    if (isEdit && brand) {
      updateBrand.mutate(
        { id: brand.id, ...brandData },
        {
          onSuccess: async () => {
            if (hasColors) {
              await updateConfig.mutateAsync({
                brandId: brand.id,
                primaryColor: primaryColor || undefined,
                accentColor: accentColor || undefined,
                logoUrl: brandData.logoUrl || undefined,
              });
            }
            onOpenChange(false);
          },
        },
      );
    } else {
      createBrand.mutate(brandData, {
        onSuccess: async (created) => {
          if (hasColors) {
            await updateConfig.mutateAsync({
              brandId: created.id,
              primaryColor: primaryColor || undefined,
              accentColor: accentColor || undefined,
              logoUrl: brandData.logoUrl || undefined,
            });
          }
          onOpenChange(false);
        },
      });
    }
  }

  const defaults: Partial<BrandFormValues> | undefined = brand
    ? {
        code: brand.code,
        displayName: brand.displayName,
        tier: brand.tier,
        logoUrl: brandDetail?.config?.logoUrl ?? undefined,
        primaryColor: brandDetail?.config?.primaryColor ?? undefined,
        accentColor: brandDetail?.config?.accentColor ?? undefined,
      }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar marca" : "Nueva marca"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <BrandForm
            defaultValues={defaults}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </SheetBody>
        <SheetFooter>
          <SheetClose>
            <Button variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </SheetClose>
          <Button type="submit" form="brand-form" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

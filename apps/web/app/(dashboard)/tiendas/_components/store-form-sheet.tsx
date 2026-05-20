"use client";

import {
  useStore,
  useCreateStore,
  useUpdateStore,
  useBrands,
  type Store,
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
import type { CreateStore } from "@loreal/contracts";
import { StoreForm } from "./store-form";

interface StoreFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store;
}

export function StoreFormSheet({
  open,
  onOpenChange,
  store,
}: StoreFormSheetProps) {
  const isEdit = Boolean(store);
  const { data: brands = [] } = useBrands();
  const { data: storeDetail } = useStore(store?.id ?? "");
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const isPending = createStore.isPending || updateStore.isPending;

  function handleSubmit(data: CreateStore) {
    if (isEdit && store) {
      updateStore.mutate(
        { id: store.id, ...data },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createStore.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  }

  const defaults: Partial<CreateStore> | undefined = store
    ? {
        code: store.code,
        displayName: store.displayName,
        chain: store.chain,
        address: store.address ?? undefined,
        city: store.city ?? undefined,
        state: store.state ?? undefined,
        district: store.district ?? undefined,
        postcode: store.postcode ?? undefined,
        lat: store.lat != null ? Number(store.lat) : undefined,
        lng: store.lng != null ? Number(store.lng) : undefined,
        phone: store.phone ?? undefined,
        hours: store.hours ?? undefined,
        brandIds: storeDetail?.brandIds ?? [],
      }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar tienda" : "Nueva tienda"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <StoreForm
            defaultValues={defaults}
            brands={brands}
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
          <Button type="submit" form="store-form" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import {
  useCreateUserDirect,
  useStores,
  useBrands,
  useZones,
  type CreateDirectUserResult,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserForm, type UserFormData } from "./user-form";
import { PasswordResultDialog } from "./password-result-dialog";

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormSheet({ open, onOpenChange }: UserFormSheetProps) {
  const { data: stores = [] } = useStores();
  const { data: brands = [] } = useBrands();
  const { data: zones = [] } = useZones();
  const createUser = useCreateUserDirect();

  const [result, setResult] = useState<CreateDirectUserResult | null>(null);

  function handleSubmit(data: UserFormData) {
    createUser.mutate(data, {
      onSuccess: (res) => {
        setResult(res);
        onOpenChange(false);
      },
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>Crear usuario</SheetTitle>
            <SheetDescription>
              El usuario quedará activo de inmediato con una contraseña temporal.
              Te la mostraremos una sola vez para que se la entregues.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <UserForm
              stores={stores}
              brands={brands}
              zones={zones}
              onSubmit={handleSubmit}
              isPending={createUser.isPending}
            />
          </SheetBody>
          <SheetFooter>
            <SheetClose>
              <Button variant="outline" disabled={createUser.isPending}>
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit" form="user-form" disabled={createUser.isPending}>
              {createUser.isPending ? "Creando..." : "Crear usuario"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <PasswordResultDialog result={result} onClose={() => setResult(null)} />
    </>
  );
}

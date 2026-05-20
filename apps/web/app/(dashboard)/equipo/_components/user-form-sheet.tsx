"use client";

import { useInviteUser, useStores, useBrands, useZones } from "@/lib/hooks";
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

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormSheet({ open, onOpenChange }: UserFormSheetProps) {
  const { data: stores = [] } = useStores();
  const { data: brands = [] } = useBrands();
  const { data: zones = [] } = useZones();
  const inviteUser = useInviteUser();

  function handleSubmit(data: UserFormData) {
    inviteUser.mutate(data, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Invitar usuario</SheetTitle>
          <SheetDescription>
            Se enviará una invitación por correo. El usuario aparecerá como
            &quot;Pendiente&quot; hasta que la acepte y configure su contraseña.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <UserForm
            stores={stores}
            brands={brands}
            zones={zones}
            onSubmit={handleSubmit}
            isPending={inviteUser.isPending}
          />
        </SheetBody>
        <SheetFooter>
          <SheetClose>
            <Button variant="outline" disabled={inviteUser.isPending}>
              Cancelar
            </Button>
          </SheetClose>
          <Button type="submit" form="user-form" disabled={inviteUser.isPending}>
            {inviteUser.isPending ? "Enviando..." : "Enviar invitación"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

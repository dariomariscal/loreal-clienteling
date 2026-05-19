"use client";

import {
  useCreateUser,
  useInviteUser,
  useStores,
  useBrands,
  useZones,
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

type Mode = "create" | "invite";

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: Mode;
}

export function UserFormSheet({
  open,
  onOpenChange,
  mode = "create",
}: UserFormSheetProps) {
  const { data: stores = [] } = useStores();
  const { data: brands = [] } = useBrands();
  const { data: zones = [] } = useZones();
  const createUser = useCreateUser();
  const inviteUser = useInviteUser();

  const isInvite = mode === "invite";
  const isPending = createUser.isPending || inviteUser.isPending;

  function handleSubmit(data: UserFormData) {
    if (isInvite) {
      inviteUser.mutate(
        {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          storeId: data.storeId,
          zoneId: data.zoneId,
          brandId: data.brandId,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createUser.mutate(
        { ...data, name: data.fullName },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>
            {isInvite ? "Invitar usuario" : "Nuevo usuario"}
          </SheetTitle>
          {isInvite && (
            <SheetDescription>
              Se enviará una invitación por correo. El usuario aparecerá como
              &quot;Pendiente&quot; hasta que la acepte.
            </SheetDescription>
          )}
        </SheetHeader>
        <SheetBody>
          <UserForm
            stores={stores}
            brands={brands}
            zones={zones}
            onSubmit={handleSubmit}
            isPending={isPending}
            hidePassword={isInvite}
          />
        </SheetBody>
        <SheetFooter>
          <SheetClose>
            <Button variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </SheetClose>
          <Button type="submit" form="user-form" disabled={isPending}>
            {isPending
              ? isInvite
                ? "Enviando..."
                : "Creando..."
              : isInvite
                ? "Enviar invitación"
                : "Crear usuario"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

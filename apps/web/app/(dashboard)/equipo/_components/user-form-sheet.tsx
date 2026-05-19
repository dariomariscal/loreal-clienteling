"use client";

import { useState } from "react";
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
import { CredentialsDialog } from "./credentials-dialog";

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

  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const isInvite = mode === "invite";
  const isPending = createUser.isPending || inviteUser.isPending;

  function handleSubmit(data: UserFormData) {
    if (isInvite) {
      inviteUser.mutate(data, { onSuccess: () => onOpenChange(false) });
      return;
    }
    createUser.mutate(data, {
      onSuccess: (user) => {
        onOpenChange(false);
        setCreatedUserId(user.id);
      },
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>
              {isInvite ? "Invitar usuario" : "Nuevo usuario"}
            </SheetTitle>
            {isInvite ? (
              <SheetDescription>
                Se enviará una invitación por correo. El usuario aparecerá como
                &quot;Pendiente&quot; hasta que la acepte.
              </SheetDescription>
            ) : (
              <SheetDescription>
                Se creará una cuenta activa con una contraseña generada automáticamente.
                Podrás verla y copiarla al finalizar.
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

      <CredentialsDialog
        userId={createdUserId}
        open={!!createdUserId}
        onOpenChange={(o) => !o && setCreatedUserId(null)}
        autoReveal
      />
    </>
  );
}

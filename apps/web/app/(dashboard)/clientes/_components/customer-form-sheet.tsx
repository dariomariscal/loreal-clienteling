"use client";

import {
  useCreateCustomer,
  useUpdateCustomer,
  type Customer,
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
import type { CreateCustomer } from "@loreal/contracts";
import { CustomerForm } from "./customer-form";

interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
}: CustomerFormSheetProps) {
  const isEdit = Boolean(customer);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  function handleSubmit(data: CreateCustomer) {
    const payload = {
      ...data,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
    };

    if (isEdit && customer) {
      updateCustomer.mutate(
        { id: customer.id, ...payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createCustomer.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="default">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar clienta" : "Nueva clienta"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <CustomerForm
            defaultValues={
              customer
                ? {
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email ?? undefined,
                    phone: customer.phone ?? undefined,
                    gender: customer.gender ?? undefined,
                    birthday: customer.birthday ?? undefined,
                  }
                : undefined
            }
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
          <Button type="submit" form="customer-form" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

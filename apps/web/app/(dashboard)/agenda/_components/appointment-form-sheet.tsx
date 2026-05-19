"use client";

import { useCreateAppointment } from "@/lib/hooks";
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
import {
  AppointmentForm,
  type AppointmentFormData,
} from "./appointment-form";

interface AppointmentFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the form when launched from a customer profile. */
  defaultCustomerId?: string;
}

export function AppointmentFormSheet({
  open,
  onOpenChange,
  defaultCustomerId,
}: AppointmentFormSheetProps) {
  const createAppointment = useCreateAppointment();

  function handleSubmit(data: AppointmentFormData) {
    createAppointment.mutate(
      {
        ...data,
        scheduledAt: new Date(data.scheduledAt),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="default">
        <SheetHeader>
          <SheetTitle>Nueva cita</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <AppointmentForm
            defaultValues={
              defaultCustomerId ? { customerId: defaultCustomerId } : undefined
            }
            onSubmit={handleSubmit}
            isPending={createAppointment.isPending}
          />
        </SheetBody>
        <SheetFooter>
          <SheetClose>
            <Button variant="outline" disabled={createAppointment.isPending}>
              Cancelar
            </Button>
          </SheetClose>
          <Button
            type="submit"
            form="appointment-form"
            disabled={createAppointment.isPending}
          >
            {createAppointment.isPending ? "Creando..." : "Crear cita"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

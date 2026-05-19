"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateZone, type Zone } from "@/lib/hooks";
import { createZoneSchema } from "@/lib/schemas/zones";
import { slugifyCode } from "@/lib/slugify";
import type { CreateZone } from "@loreal/contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ZoneQuickCreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (zone: Zone) => void;
  initialName?: string;
  isPending?: boolean;
}

/**
 * ZoneQuickCreate — minimal nested dialog opened from a parent form's
 * Combobox when the user types a non-existing zone and chooses "+ Create".
 * The parent form keeps its values; the new zone is auto-selected on success.
 */
export function ZoneQuickCreate({
  open,
  onOpenChange,
  onCreated,
  initialName = "",
}: ZoneQuickCreateProps) {
  const createZone = useCreateZone();

  const form = useForm<CreateZone>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: { code: "", displayName: initialName, region: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: slugifyCode(initialName),
        displayName: initialName,
        region: "",
      });
    }
  }, [open, initialName, form]);

  function handleSubmit(data: CreateZone) {
    createZone.mutate(data, {
      onSuccess: (zone) => onCreated(zone),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear zona</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form
              id="zone-quick-create"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Zona Centro"
                        disabled={createZone.isPending}
                        autoFocus
                        onChange={(e) => {
                          field.onChange(e);
                          const currentCode = form.getValues("code");
                          if (!currentCode || currentCode === slugifyCode(field.value)) {
                            form.setValue("code", slugifyCode(e.target.value), {
                              shouldValidate: true,
                            });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="CENTRO"
                        disabled={createZone.isPending}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <DialogClose>
            <Button variant="outline" disabled={createZone.isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="zone-quick-create"
            disabled={createZone.isPending}
          >
            {createZone.isPending ? "Creando..." : "Crear y seleccionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


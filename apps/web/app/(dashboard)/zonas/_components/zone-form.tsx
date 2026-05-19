"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateZone } from "@loreal/contracts";
import { createZoneSchema } from "@/lib/schemas/zones";
import { slugifyCode } from "@/lib/slugify";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

interface ZoneFormProps {
  defaultValues?: Partial<CreateZone>;
  onSubmit: (data: CreateZone) => void;
  isPending: boolean;
}

export function ZoneForm({ defaultValues, onSubmit, isPending }: ZoneFormProps) {
  const form = useForm<CreateZone>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
      displayName: defaultValues?.displayName ?? "",
      region: defaultValues?.region ?? "",
    },
  });

  return (
    <Form {...form}>
      <form id="zone-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  disabled={isPending}
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
                  disabled={isPending}
                  className="font-mono uppercase"
                />
              </FormControl>
              <FormDescription>
                Se genera desde el nombre. Puedes editarlo si necesitas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Región (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Ciudad de México y Estado de México"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

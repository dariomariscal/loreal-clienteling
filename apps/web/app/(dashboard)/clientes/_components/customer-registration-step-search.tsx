"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  registrationSearchSchema,
  type RegistrationSearchValues,
} from "@/lib/schemas/customer-registration";
import { useDuplicateCheck } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface CustomerRegistrationStepSearchProps {
  onContinue: (values: RegistrationSearchValues) => void;
  onCancel: () => void;
}

export function CustomerRegistrationStepSearch({
  onContinue,
  onCancel,
}: CustomerRegistrationStepSearchProps) {
  const router = useRouter();
  const form = useForm<RegistrationSearchValues>({
    resolver: zodResolver(registrationSearchSchema),
    defaultValues: { email: "", phone: "" },
    mode: "onBlur",
  });

  const email = form.watch("email");
  const phone = form.watch("phone");
  const duplicateCheck = useDuplicateCheck({ email, phone });

  const matches = duplicateCheck.data?.matches ?? [];
  const hasMatch = matches.length > 0;

  function handleContinue() {
    onContinue({ email, phone });
  }

  return (
    <Form {...form}>
      <form
        id="customer-registration-search-form"
        onSubmit={form.handleSubmit(handleContinue)}
        className="space-y-5"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Buscar antes de registrar</h3>
          <p className="text-xs text-muted-foreground">
            Captura el email o teléfono para verificar si la clienta ya existe en otra tienda.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="maria@ejemplo.com"
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="5512345678"
                    inputMode="tel"
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {duplicateCheck.isFetching && (
          <p className="text-xs text-muted-foreground">Buscando coincidencias…</p>
        )}

        {hasMatch && (
          <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-3">
            <p className="text-xs font-medium text-warning-foreground">
              {matches.length === 1
                ? "Encontramos una clienta con esos datos:"
                : `Encontramos ${matches.length} clientas con esos datos:`}
            </p>
            <ul className="space-y-2">
              {matches.map((m) => (
                <li
                  key={m.customerId}
                  className="flex items-center justify-between gap-2 rounded-sm bg-background p-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                    <div className="text-sm">
                      <p className="font-medium leading-tight">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.storeName} · coincide por {m.matchedOn === "email" ? "email" : "teléfono"}
                      </p>
                    </div>
                  </div>
                  {m.inUserScope ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/clientes/${m.customerId}`)}
                    >
                      Abrir perfil
                    </Button>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      Otra tienda
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onContinue({ email: "", phone: "" })}
          >
            Saltar
          </Button>
          <Button
            type="submit"
            form="customer-registration-search-form"
          >
            {hasMatch ? "Es una clienta nueva, continuar" : "Continuar"}
          </Button>
        </div>
      </div>
    </Form>
  );
}

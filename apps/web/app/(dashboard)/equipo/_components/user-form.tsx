"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { USER_ROLES } from "@loreal/contracts";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { Store, Brand, Zone } from "@/lib/hooks";

const EMAIL_DOMAIN = "@loreal.mx";

const EMAIL_LOCAL_RE = /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/i;

const userFormSchema = z.object({
  fullName: z.string().min(1, "Requerido").max(200),
  emailLocal: z
    .string()
    .min(1, "Requerido")
    .max(64, "Máximo 64 caracteres")
    .regex(EMAIL_LOCAL_RE, "Solo letras, números, punto, guion y guion bajo"),
  role: z.enum(USER_ROLES as [string, ...string[]]),
  storeId: z.string().optional(),
  zoneId: z.string().optional(),
  brandId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export interface UserFormData {
  email: string;
  fullName: string;
  role: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ba: "Beauty Advisor",
  manager: "Gerente",
  supervisor: "Supervisor",
  admin: "Administrador",
};

interface UserFormProps {
  stores: Store[];
  brands: Brand[];
  zones: Zone[];
  onSubmit: (data: UserFormData) => void;
  isPending: boolean;
}

export function UserForm({ stores, brands, zones, onSubmit, isPending }: UserFormProps) {
  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s])),
    [stores],
  );
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.displayName]));
  const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z.displayName]));

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      emailLocal: "",
      role: "ba",
      storeId: "",
      brandId: "",
      zoneId: "",
    },
  });

  // Auto-derive zone from store. Once the user picks a store, fill the zone
  // field unless the admin has already chosen a different one.
  const storeId = form.watch("storeId");
  useEffect(() => {
    if (!storeId) return;
    const derivedZoneId = storeMap[storeId]?.zoneId ?? "";
    if (!derivedZoneId) return;
    const currentZone = form.getValues("zoneId");
    if (!currentZone) {
      form.setValue("zoneId", derivedZoneId, { shouldDirty: false });
    }
  }, [storeId, storeMap, form]);

  function handleSubmit(values: UserFormValues) {
    onSubmit({
      fullName: values.fullName,
      email: `${values.emailLocal.toLowerCase()}${EMAIL_DOMAIN}`,
      role: values.role,
      storeId: values.storeId || undefined,
      brandId: values.brandId || undefined,
      zoneId: values.zoneId || undefined,
    });
  }

  return (
    <Form {...form}>
      <form id="user-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ana Martínez Ruiz" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emailLocal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo</FormLabel>
                <FormControl>
                  <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
                    <input
                      {...field}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="a.martinez"
                      disabled={isPending}
                      className="min-w-0 flex-1 bg-transparent px-3 py-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span className="flex shrink-0 select-none items-center border-l border-input bg-muted px-3 text-muted-foreground">
                      {EMAIL_DOMAIN}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger disabled={isPending}>
                    <SelectValue placeholder="Seleccionar rol">
                      {field.value ? ROLE_LABELS[field.value] ?? field.value : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r] ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="storeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tienda</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar tienda">
                        {field.value
                          ? storeMap[field.value]?.displayName ?? field.value
                          : "Sin asignar"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar marca">
                        {field.value ? brandMap[field.value] ?? field.value : "Sin asignar"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zoneId"
            render={({ field }) => {
              const derived = storeId ? storeMap[storeId]?.zoneId : null;
              const isDerived = !!derived && field.value === derived;
              return (
                <FormItem>
                  <FormLabel>
                    Zona{isDerived ? <span className="ml-1 text-xs text-muted-foreground">(auto)</span> : null}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isPending}>
                        <SelectValue placeholder="Seleccionar zona">
                          {field.value ? zoneMap[field.value] ?? field.value : "Sin asignar"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          La contraseña se genera automáticamente. Podrás verla y copiarla desde la lista
          de equipo una vez creado el usuario.
        </p>
      </form>
    </Form>
  );
}

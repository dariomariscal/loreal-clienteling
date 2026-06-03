"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  USER_ROLES,
  BEAUTY_ADVISOR_SPECIALTIES,
} from "@loreal/contracts";
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
import {
  useStore,
  useDivisions,
  type Store,
  type Brand,
  type Zone,
} from "@/lib/hooks";

const EMAIL_DOMAIN = "@loreal.mx";

const EMAIL_LOCAL_RE = /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/i;

const userFormSchema = z
  .object({
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
    divisionId: z.string().optional(),
    specialty: z
      .enum(BEAUTY_ADVISOR_SPECIALTIES as unknown as [string, ...string[]])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "area_manager") {
      if (!data.zoneId) {
        ctx.addIssue({
          code: "custom",
          path: ["zoneId"],
          message: "Requerido para Gerente de Zona",
        });
      }
      if (!data.divisionId) {
        ctx.addIssue({
          code: "custom",
          path: ["divisionId"],
          message: "Requerido para Gerente de Zona",
        });
      }
    }
    if (data.role === "national_retail_manager" && !data.divisionId) {
      ctx.addIssue({
        code: "custom",
        path: ["divisionId"],
        message: "Requerido para Director Nacional",
      });
    }
    if (
      (data.role === "beauty_advisor" || data.role === "counter_manager") &&
      !data.storeId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["storeId"],
        message: "Requerido para este rol",
      });
    }
  });

type UserFormValues = z.infer<typeof userFormSchema>;

export interface UserFormData {
  email: string;
  fullName: string;
  role: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
  divisionId?: string;
  specialty?: string;
}

/**
 * Spanish-MX labels. Keys match the official L'Oréal Luxe nomenclature
 * (see rfp-loreal-clienteling/10-roles-operativos.md).
 */
const ROLE_LABELS: Record<string, string> = {
  beauty_advisor: "Beauty Advisor",
  counter_manager: "Gerente de Mostrador",
  area_manager: "Gerente de Zona",
  national_retail_manager: "Director Nacional de Retail",
  admin: "Administrador",
};

const SPECIALTY_LABELS: Record<string, string> = {
  generalist: "Generalista",
  makeup_artist: "Makeup Artist",
  skincare_expert: "Experta en Skincare",
  fragrance_specialist: "Especialista en Fragancias",
};

interface UserFormProps {
  stores: Store[];
  brands: Brand[];
  zones: Zone[];
  onSubmit: (data: UserFormData) => void;
  isPending: boolean;
}

export function UserForm({
  stores,
  brands,
  zones,
  onSubmit,
  isPending,
}: UserFormProps) {
  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s])),
    [stores],
  );
  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b])),
    [brands],
  );
  const zoneMap = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z.displayName])),
    [zones],
  );

  const { data: divisions = [] } = useDivisions();
  const divisionMap = useMemo(
    () => Object.fromEntries(divisions.map((d) => [d.id, d.displayName])),
    [divisions],
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      emailLocal: "",
      role: "beauty_advisor",
      storeId: "",
      brandId: "",
      zoneId: "",
      divisionId: "",
      specialty: "generalist",
    },
  });

  const role = form.watch("role");
  const storeId = form.watch("storeId");

  const needsStore = role === "beauty_advisor" || role === "counter_manager";
  const needsZone = role === "area_manager";
  const needsDivision =
    role === "area_manager" || role === "national_retail_manager";
  const showBrand = role === "beauty_advisor" || role === "counter_manager";
  const showSpecialty = role === "beauty_advisor";

  // Pull brand availability for the selected store. Only ba/counter_manager
  // pick a store and care about its brand catalogue.
  const { data: storeDetail } = useStore(
    needsStore && storeId ? storeId : "",
  );
  const allowedBrandIds = storeDetail?.brandIds ?? null;

  const availableBrands = useMemo(() => {
    if (!showBrand) return [];
    if (!allowedBrandIds) return []; // no store yet
    return allowedBrandIds
      .map((id) => brandMap[id])
      .filter((b): b is Brand => Boolean(b));
  }, [showBrand, allowedBrandIds, brandMap]);

  // Auto-derive zone from store (ba/counter_manager flow).
  useEffect(() => {
    if (!needsStore || !storeId) return;
    const derivedZoneId = storeMap[storeId]?.zoneId ?? "";
    if (!derivedZoneId) return;
    form.setValue("zoneId", derivedZoneId, { shouldDirty: false });
  }, [needsStore, storeId, storeMap, form]);

  // Auto-pick brand when the store sells exactly one. Clear stale picks when
  // they no longer match the store's catalogue.
  useEffect(() => {
    if (!needsStore || !allowedBrandIds) return;
    const current = form.getValues("brandId");
    if (allowedBrandIds.length === 1) {
      if (current !== allowedBrandIds[0]) {
        form.setValue("brandId", allowedBrandIds[0], { shouldDirty: false });
      }
      return;
    }
    if (current && !allowedBrandIds.includes(current)) {
      form.setValue("brandId", "", { shouldDirty: false });
    }
  }, [needsStore, allowedBrandIds, form]);

  // Reset scope fields when the role changes so leftover values don't sneak
  // into the payload (e.g. switching to admin should clear storeId).
  useEffect(() => {
    if (role === "admin") {
      form.setValue("storeId", "");
      form.setValue("zoneId", "");
      form.setValue("brandId", "");
      form.setValue("divisionId", "");
      form.setValue("specialty", undefined);
      return;
    }
    if (role === "area_manager") {
      form.setValue("storeId", "");
      form.setValue("brandId", "");
      form.setValue("specialty", undefined);
    }
    if (role === "national_retail_manager") {
      form.setValue("storeId", "");
      form.setValue("zoneId", "");
      form.setValue("brandId", "");
      form.setValue("specialty", undefined);
    }
    if (role === "counter_manager") {
      form.setValue("specialty", undefined);
    }
    if (role === "beauty_advisor") {
      const current = form.getValues("specialty");
      if (!current) form.setValue("specialty", "generalist");
    }
  }, [role, form]);

  function handleSubmit(values: UserFormValues) {
    onSubmit({
      fullName: values.fullName,
      email: `${values.emailLocal.toLowerCase()}${EMAIL_DOMAIN}`,
      role: values.role,
      storeId: values.storeId || undefined,
      brandId: values.brandId || undefined,
      zoneId: values.zoneId || undefined,
      divisionId: values.divisionId || undefined,
      specialty: values.specialty || undefined,
    });
  }

  const brandHelp = (() => {
    if (!showBrand) return null;
    if (!storeId) return "Selecciona primero una sucursal.";
    if (allowedBrandIds && allowedBrandIds.length === 0) {
      return "Esta sucursal no tiene marcas asignadas.";
    }
    if (allowedBrandIds && allowedBrandIds.length === 1) {
      return "Asignada automáticamente: solo hay una marca en esta sucursal.";
    }
    return null;
  })();

  return (
    <Form {...form}>
      <form
        id="user-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ana Martínez Ruiz"
                    disabled={isPending}
                  />
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
            <FormItem className="min-w-0">
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger disabled={isPending} className="w-full">
                    <SelectValue placeholder="Seleccionar rol">
                      {field.value
                        ? ROLE_LABELS[field.value] ?? field.value
                        : undefined}
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
          {needsStore && (
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Sucursal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger disabled={isPending} className="w-full">
                        <SelectValue placeholder="Seleccionar sucursal">
                          {field.value
                            ? storeMap[field.value]?.displayName ?? field.value
                            : "Seleccionar"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      alignItemWithTrigger={false}
                      className="w-auto min-w-(--anchor-width) max-w-[min(22rem,calc(100vw-2rem))]"
                    >
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
          )}

          {showBrand && (
            <FormField
              control={form.control}
              name="brandId"
              render={({ field }) => {
                const disabled =
                  isPending ||
                  !storeId ||
                  availableBrands.length === 0 ||
                  availableBrands.length === 1;
                return (
                  <FormItem className="min-w-0">
                    <FormLabel>Marca</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger disabled={disabled} className="w-full">
                          <SelectValue placeholder="Seleccionar marca">
                            {field.value
                              ? brandMap[field.value]?.displayName ??
                                field.value
                              : "Sin asignar"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="w-auto min-w-(--anchor-width) max-w-[min(22rem,calc(100vw-2rem))]"
                      >
                        {availableBrands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {brandHelp ? (
                      <p className="text-xs text-muted-foreground">
                        {brandHelp}
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}

          {(needsZone || needsStore) && (
            <FormField
              control={form.control}
              name="zoneId"
              render={({ field }) => {
                const derived =
                  needsStore && storeId ? storeMap[storeId]?.zoneId : null;
                const isDerived = !!derived && field.value === derived;
                const disabled = isPending || (needsStore && !!derived);
                return (
                  <FormItem className="min-w-0">
                    <FormLabel>
                      Zona
                      {isDerived ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (auto)
                        </span>
                      ) : null}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger disabled={disabled} className="w-full">
                          <SelectValue placeholder="Seleccionar zona">
                            {field.value
                              ? zoneMap[field.value] ?? field.value
                              : "Sin asignar"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="w-auto min-w-(--anchor-width) max-w-[min(22rem,calc(100vw-2rem))]"
                      >
                        {!needsZone && <SelectItem value="">Sin asignar</SelectItem>}
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
          )}
        </div>

        {needsDivision && (
          <FormField
            control={form.control}
            name="divisionId"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>División</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger disabled={isPending} className="w-full">
                      <SelectValue placeholder="Seleccionar división">
                        {field.value
                          ? divisionMap[field.value] ?? field.value
                          : "Seleccionar"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {role === "area_manager"
                    ? "El Gerente de Zona verá todas las marcas de esta división en su zona."
                    : "El Director Nacional verá todas las marcas de esta división a nivel nacional."}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showSpecialty && (
          <FormField
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Especialidad</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? "generalist"}
                >
                  <FormControl>
                    <SelectTrigger disabled={isPending} className="w-full">
                      <SelectValue>
                        {SPECIALTY_LABELS[field.value ?? "generalist"]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BEAUTY_ADVISOR_SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SPECIALTY_LABELS[s] ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  No altera permisos. Se usa para enrutamiento inteligente de
                  clientas (por ej. piel sensible → experta en skincare).
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <p className="text-xs text-muted-foreground">
          Se generará una contraseña que solo verás una vez al terminar de
          crear el usuario. Cópiala y entrégala por un canal seguro.
        </p>
      </form>
    </Form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateStore, STORE_CHAINS } from "@loreal/contracts";
import { createStoreSchema } from "@/lib/schemas/stores";
import { useCreateZone, type Zone, type Brand } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { StaticMap } from "@/components/ui/static-map";
import { ZoneQuickCreate } from "@/app/(dashboard)/zonas/_components/zone-quick-create";
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

const CHAIN_LABELS: Record<string, string> = {
  liverpool: "Liverpool",
  palacio: "Palacio de Hierro",
  owned: "Boutique propia",
};

interface StoreFormProps {
  defaultValues?: Partial<CreateStore>;
  zones: Zone[];
  brands: Brand[];
  onSubmit: (data: CreateStore) => void;
  isPending: boolean;
}

export function StoreForm({
  defaultValues,
  zones,
  brands,
  onSubmit,
  isPending,
}: StoreFormProps) {
  const [quickCreate, setQuickCreate] = useState<{ name: string } | null>(null);
  const createZone = useCreateZone();

  const form = useForm<CreateStore>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
      displayName: defaultValues?.displayName ?? "",
      chain: defaultValues?.chain ?? STORE_CHAINS[0],
      zoneId: defaultValues?.zoneId ?? undefined,
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      lat: defaultValues?.lat,
      lng: defaultValues?.lng,
      brandIds: defaultValues?.brandIds ?? [],
    },
  });

  const lat = form.watch("lat");
  const lng = form.watch("lng");

  const zoneOptions = zones.map((z) => ({
    value: z.id,
    label: z.displayName,
    description: z.code,
  }));

  const brandOptions: MultiSelectOption[] = brands.map((b) => ({
    value: b.id,
    label: b.displayName,
  }));

  async function handleQuickCreateZone(name: string) {
    setQuickCreate({ name });
  }

  function onZoneCreated(zone: Zone) {
    form.setValue("zoneId", zone.id, { shouldValidate: true });
    setQuickCreate(null);
  }

  function handleSubmit(data: CreateStore) {
    onSubmit({
      ...data,
      zoneId: data.zoneId || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
    });
  }

  return (
    <Form {...form}>
      <form
        id="store-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="LIV-POLANCO" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Liverpool Polanco" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="chain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cadena</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar cadena">
                        {field.value ? CHAIN_LABELS[field.value] ?? field.value : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STORE_CHAINS.map((chain) => (
                      <SelectItem key={chain} value={chain}>
                        {CHAIN_LABELS[chain] ?? chain}
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona</FormLabel>
                <FormControl>
                  <Combobox
                    options={zoneOptions}
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    placeholder="Seleccionar zona"
                    searchPlaceholder="Buscar o crear zona..."
                    onCreate={handleQuickCreateZone}
                    createLabel={(q) => `Crear zona "${q}"`}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="brandIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marcas que operan en esta tienda</FormLabel>
              <FormControl>
                <MultiSelect
                  options={brandOptions}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Selecciona una o más marcas"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <AddressAutocomplete
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onSelect={(result) => {
                    form.setValue("address", result.address);
                    form.setValue("city", result.city ?? "");
                    form.setValue("state", result.state ?? "");
                    form.setValue("lat", result.lat);
                    form.setValue("lng", result.lng);
                  }}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <StaticMap lat={lat} lng={lng} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Ciudad de México"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="CDMX"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>

      <ZoneQuickCreate
        open={quickCreate !== null}
        initialName={quickCreate?.name ?? ""}
        onOpenChange={(open) => !open && setQuickCreate(null)}
        onCreated={onZoneCreated}
        isPending={createZone.isPending}
      />
    </Form>
  );
}

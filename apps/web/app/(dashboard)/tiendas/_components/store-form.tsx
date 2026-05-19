"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPinIcon } from "lucide-react";
import { type CreateStore, STORE_CHAINS } from "@loreal/contracts";
import { createStoreSchema } from "@/lib/schemas/stores";
import { useZoneByPoint, type Brand } from "@/lib/hooks";
import { slugifyCode } from "@/lib/slugify";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { StaticMap } from "@/components/ui/static-map";
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
  defaultValues?: Partial<CreateStore> & { district?: string };
  brands: Brand[];
  onSubmit: (data: CreateStore) => void;
  isPending: boolean;
}

export function StoreForm({
  defaultValues,
  brands,
  onSubmit,
  isPending,
}: StoreFormProps) {
  const form = useForm<CreateStore>({
    resolver: zodResolver(createStoreSchema) as never,
    defaultValues: {
      code: defaultValues?.code ?? "",
      displayName: defaultValues?.displayName ?? "",
      chain: defaultValues?.chain ?? STORE_CHAINS[0],
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      district: defaultValues?.district ?? "",
      postcode: defaultValues?.postcode ?? "",
      lat: defaultValues?.lat,
      lng: defaultValues?.lng,
      brandIds: defaultValues?.brandIds ?? [],
    },
  });

  const lat = form.watch("lat");
  const lng = form.watch("lng");
  const district = form.watch("district");

  // Inferred zone (server-side point-in-polygon over zone_municipalities).
  const { data: inferredZone } = useZoneByPoint(lat, lng);

  const brandOptions: MultiSelectOption[] = brands.map((b) => ({
    value: b.id,
    label: b.displayName,
  }));

  function handleSubmit(data: CreateStore) {
    onSubmit({
      ...data,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      district: data.district || undefined,
      postcode: data.postcode || undefined,
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
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Liverpool Polanco"
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
                    placeholder="LIVERPOOL-POLANCO"
                    disabled={isPending}
                    className="font-mono uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                    form.setValue("district", result.district ?? "");
                    form.setValue("postcode", result.postcode ?? "");
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

        {(district || inferredZone) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-xs">
            <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Detectado:</span>
            {district && (
              <Badge variant="secondary" size="default">
                {district}
              </Badge>
            )}
            {inferredZone ? (
              <Badge
                variant="default"
                size="default"
                style={{ backgroundColor: inferredZone.color, color: "#fff" }}
              >
                Zona: {inferredZone.displayName}
              </Badge>
            ) : (
              district && (
                <span className="text-muted-foreground/80">
                  · Sin zona asignada (se agrupará después desde Zonas)
                </span>
              )
            )}
          </div>
        )}

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
    </Form>
  );
}

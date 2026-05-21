"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPinGlyph } from "@/components/ui/glyphs";
import {
  type CreateStore,
  type StoreHours,
  STORE_CHAINS,
} from "@loreal/contracts";
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

type StoreFormValues = CreateStore & {
  storeHoursLabel?: string;
  clickCollectHoursLabel?: string;
  accessNote?: string;
};

function firstHoursValue(map?: Record<string, string>): string {
  if (!map) return "";
  const entries = Object.entries(map);
  if (entries.length === 0) return "";
  // Render "mon-sun: 11:00-21:00" so the user sees the range key when it
  // differs from the default. The common case (single "mon-sun" key) gets
  // shortened to just the value.
  const [key, value] = entries[0];
  if (entries.length === 1 && key === "mon-sun") return value;
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
}

function parseHoursLabel(label: string | undefined): Record<string, string> | undefined {
  if (!label) return undefined;
  const trimmed = label.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes(":") && trimmed.includes(",")) {
    // multi-range input: "mon-fri: 11-21, sat-sun: 12-20"
    const out: Record<string, string> = {};
    for (const part of trimmed.split(",")) {
      const [k, ...rest] = part.split(":");
      if (k && rest.length > 0) {
        out[k.trim()] = rest.join(":").trim();
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return { "mon-sun": trimmed };
}

export function StoreForm({
  defaultValues,
  brands,
  onSubmit,
  isPending,
}: StoreFormProps) {
  const form = useForm<StoreFormValues>({
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
      phone: defaultValues?.phone ?? "",
      brandIds: defaultValues?.brandIds ?? [],
      storeHoursLabel: firstHoursValue(defaultValues?.hours?.store),
      clickCollectHoursLabel: firstHoursValue(defaultValues?.hours?.clickCollect),
      accessNote: defaultValues?.hours?.access ?? "",
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

  function handleSubmit(data: StoreFormValues) {
    const {
      storeHoursLabel,
      clickCollectHoursLabel,
      accessNote,
      ...rest
    } = data;

    const storeHours = parseHoursLabel(storeHoursLabel);
    const clickCollectHours = parseHoursLabel(clickCollectHoursLabel);
    const access = accessNote?.trim() || undefined;
    const hours: StoreHours | undefined =
      storeHours || clickCollectHours || access
        ? { store: storeHours, clickCollect: clickCollectHours, access }
        : undefined;

    onSubmit({
      ...rest,
      address: rest.address || undefined,
      city: rest.city || undefined,
      state: rest.state || undefined,
      district: rest.district || undefined,
      postcode: rest.postcode || undefined,
      phone: rest.phone?.trim() || undefined,
      hours,
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
            <MapPinGlyph className="size-3.5 shrink-0 text-muted-foreground" />
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

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="4491393400"
                  inputMode="tel"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 rounded-xl border border-border/60 p-4">
          <h3 className="text-sm font-medium">Horarios</h3>
          <p className="text-xs text-muted-foreground">
            Usa <span className="font-mono">11:00-21:00</span> para todos los días, o
            varios rangos separados por coma:{" "}
            <span className="font-mono">mon-fri: 11-21, sat-sun: 12-20</span>.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="storeHoursLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tienda</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="11:00-21:00"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clickCollectHoursLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Click & Collect</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="11:00-21:00"
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
            name="accessNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas de acceso</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Entrada por Playa y viaje"
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

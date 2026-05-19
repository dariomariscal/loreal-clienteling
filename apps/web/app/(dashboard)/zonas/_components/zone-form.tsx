"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateZone } from "@loreal/contracts";
import { createZoneSchema } from "@/lib/schemas/zones";
import { slugifyCode } from "@/lib/slugify";
import { useMunicipalities, useStores, useZones } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ZonesMap } from "@/components/dashboard/zones-map";
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

const PRESET_COLORS = [
  "#D4AF37", // gold
  "#1F2937", // slate
  "#B91C1C", // red
  "#047857", // emerald
  "#1D4ED8", // blue
  "#7C3AED", // violet
  "#EA580C", // orange
];

export function ZoneForm({ defaultValues, onSubmit, isPending }: ZoneFormProps) {
  const { data: municipalities = [] } = useMunicipalities();
  const { data: stores = [] } = useStores();
  const { data: zones = [] } = useZones();

  const form = useForm<CreateZone>({
    resolver: zodResolver(createZoneSchema) as never,
    defaultValues: {
      code: defaultValues?.code ?? "",
      displayName: defaultValues?.displayName ?? "",
      color: defaultValues?.color ?? PRESET_COLORS[0],
      icon: defaultValues?.icon ?? "map-pin",
      municipalityIds: defaultValues?.municipalityIds ?? [],
    },
  });

  const selectedColor = form.watch("color") ?? PRESET_COLORS[0];
  const selectedMunicipalityIds = form.watch("municipalityIds") ?? [];

  return (
    <Form {...form}>
      <form
        id="zone-form"
        onSubmit={form.handleSubmit(onSubmit)}
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
                  placeholder="CDMX Norte"
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
                  placeholder="CDMX-NORTE"
                  disabled={isPending}
                  className="font-mono uppercase"
                />
              </FormControl>
              <FormDescription>Se genera desde el nombre.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      aria-label={c}
                      className="size-8 rounded-full border border-border/60 shadow-sm transition-all hover:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-ring data-[active=true]:ring-offset-2"
                      data-active={field.value === c}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <Input
                    type="text"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="#000000"
                    disabled={isPending}
                    className="w-28 font-mono"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="municipalityIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alcaldías incluidas</FormLabel>
              <FormDescription>
                Haz clic en el mapa para incluir o excluir alcaldías. Las tiendas en ellas quedarán
                automáticamente asignadas a esta zona.
              </FormDescription>
              <FormControl>
                <div className="h-[320px]">
                  <ZonesMap
                    zones={zones}
                    stores={stores}
                    selectedMunicipalityIds={field.value ?? []}
                    selectionColor={selectedColor}
                    onMunicipalitySelectionChange={(ids) => field.onChange(ids)}
                  />
                </div>
              </FormControl>
              {selectedMunicipalityIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedMunicipalityIds.map((mid) => {
                    const m = municipalities.find((x) => x.id === mid);
                    return (
                      <Badge
                        key={mid}
                        variant="default"
                        size="default"
                        style={{ backgroundColor: selectedColor, color: "#fff" }}
                      >
                        {m?.name ?? mid}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

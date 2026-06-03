"use client";

import { useCreateZone, useUpdateZone, type Zone } from "@/lib/hooks";
import { findPresetForMunicipality } from "@/lib/zone-presets";
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
import type { CreateZone } from "@loreal/contracts";
import { ZoneForm } from "./zone-form";

interface ZoneFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: Zone;
  /** When creating a new zone from the "ungrouped" chip, preselect these municipalities. */
  presetMunicipalityIds?: string[];
}

export function ZoneFormSheet({
  open,
  onOpenChange,
  zone,
  presetMunicipalityIds,
}: ZoneFormSheetProps) {
  const isEdit = Boolean(zone);
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const isPending = createZone.isPending || updateZone.isPending;

  function handleSubmit(data: CreateZone) {
    if (isEdit && zone) {
      updateZone.mutate(
        { id: zone.id, ...data },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createZone.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  }

  // When the admin clicks a single municipality on the map, look up its
  // canonical preset region (CDMX cuadrante or EdoMex zona metropolitana) and
  // prefill the whole sibling group. They can still edit anything.
  const presetMatch =
    presetMunicipalityIds?.length === 1
      ? findPresetForMunicipality(presetMunicipalityIds[0])
      : null;

  const defaults = zone
    ? {
        code: zone.code,
        displayName: zone.displayName,
        color: zone.color,
        icon: zone.icon,
        municipalityIds: zone.municipalityIds,
      }
    : presetMatch
      ? {
          code: presetMatch.code,
          displayName: presetMatch.displayName,
          color: presetMatch.color,
          municipalityIds: presetMatch.municipalityIds,
        }
      : presetMunicipalityIds && presetMunicipalityIds.length > 0
        ? { municipalityIds: presetMunicipalityIds }
        : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="default">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar zona" : "Nueva zona"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ZoneForm
            defaultValues={defaults}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </SheetBody>
        <SheetFooter>
          <SheetClose>
            <Button variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </SheetClose>
          <Button type="submit" form="zone-form" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

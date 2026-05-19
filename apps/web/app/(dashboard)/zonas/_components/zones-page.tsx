"use client";

import { useMemo, useState } from "react";
import { StoreIcon, PencilIcon, PlusIcon } from "lucide-react";
import {
  useZones,
  useStores,
  useMunicipalities,
  type Zone,
} from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ZonesIllustration } from "@/components/ui/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZonesMap } from "@/components/dashboard/zones-map";
import { ZoneFormSheet } from "./zone-form-sheet";

interface ZonesPageProps {
  user: { role?: string | null };
}

export function ZonesPage({ user }: ZonesPageProps) {
  const role = user.role ?? "ba";
  const { data: zones = [], isLoading: zonesLoading } = useZones();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: municipalities = [] } = useMunicipalities();

  const [editing, setEditing] = useState<Zone | null>(null);
  const [creating, setCreating] = useState(false);
  const [presetMunicipalityIds, setPresetMunicipalityIds] = useState<string[]>([]);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);

  // Map: municipalityId -> store count for ungrouped indicator
  const ungroupedCount = useMemo(() => {
    const ids = new Set<string>();
    for (const s of stores) {
      if (s.municipalityId && !s.zoneId) ids.add(s.municipalityId);
    }
    return ids.size;
  }, [stores]);

  const totalStoresWithoutGeo = stores.filter((s) => !s.municipalityId).length;
  const isLoading = zonesLoading || storesLoading;
  const hasNoStores = !isLoading && stores.length === 0;

  function startCreate(preselected: string[] = []) {
    setPresetMunicipalityIds(preselected);
    setCreating(true);
  }

  function onSheetClose(open: boolean) {
    if (!open) {
      setCreating(false);
      setEditing(null);
      setPresetMunicipalityIds([]);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Zonas"
        description="Agrupa las alcaldías donde operas en zonas comerciales. Las tiendas se asignan automáticamente."
        action={
          can(role, "zone.create") && stores.length > 0 ? (
            <Button onClick={() => startCreate([])}>
              <PlusIcon className="size-4" />
              Nueva zona
            </Button>
          ) : undefined
        }
      />

      {hasNoStores ? (
        <EmptyState
          illustration={<ZonesIllustration className="w-full" />}
          title="Aún no tienes tiendas"
          description="Las zonas se forman agrupando las alcaldías donde tienes tiendas. Crea primero tus tiendas y vuelve aquí para organizarlas."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Mapa */}
          <div className="h-[640px] min-h-[420px]">
            <ZonesMap
              zones={zones}
              stores={stores}
              focusedZoneId={focusedZoneId}
              onMunicipalitySelectionChange={
                can(role, "zone.create")
                  ? (ids) => {
                      // Single-click to start a new zone with that municipality preselected.
                      // We open the sheet only on the first click; subsequent clicks edit selection in the form.
                      if (ids.length > 0 && !creating && !editing) {
                        startCreate(ids);
                      }
                    }
                  : undefined
              }
            />
          </div>

          {/* Sidebar de zonas */}
          <aside className="space-y-4">
            <section className="space-y-2">
              <header className="flex items-baseline justify-between">
                <h2 className="text-sm font-medium">Tus zonas</h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {zones.length}
                </span>
              </header>

              {zones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                  Aún no has creado ninguna zona. Haz clic en una alcaldía del mapa para empezar.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {zones.map((z) => {
                    const storeCount = stores.filter((s) => s.zoneId === z.id).length;
                    const isFocused = focusedZoneId === z.id;
                    return (
                      <li key={z.id}>
                        <div
                          className={`group flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-150 ${
                            isFocused
                              ? "border-foreground/20 bg-muted/60 shadow-sm"
                              : "border-border/60 bg-card hover:border-foreground/10 hover:bg-muted/30"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setFocusedZoneId(isFocused ? null : z.id)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none"
                            aria-pressed={isFocused}
                          >
                            <span
                              aria-hidden
                              className="size-3 shrink-0 rounded-full ring-2 ring-white"
                              style={{ backgroundColor: z.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-medium">{z.displayName}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <StoreIcon className="size-3" />
                                {storeCount}
                                <span aria-hidden>·</span>
                                {z.municipalityIds.length}{" "}
                                {z.municipalityIds.length === 1 ? "alcaldía" : "alcaldías"}
                              </div>
                            </div>
                          </button>
                          {can(role, "zone.edit") && (
                            <button
                              type="button"
                              onClick={() => setEditing(z)}
                              className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                              aria-label={`Editar ${z.displayName}`}
                            >
                              <PencilIcon className="size-3.5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {(ungroupedCount > 0 || totalStoresWithoutGeo > 0) && (
              <section className="space-y-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs">
                <h3 className="font-medium">Pendientes</h3>
                {ungroupedCount > 0 && (
                  <p className="text-muted-foreground">
                    {ungroupedCount}{" "}
                    {ungroupedCount === 1 ? "alcaldía con tiendas" : "alcaldías con tiendas"} sin zona. Haz clic
                    en el mapa para agruparlas.
                  </p>
                )}
                {totalStoresWithoutGeo > 0 && (
                  <p className="text-muted-foreground">
                    {totalStoresWithoutGeo}{" "}
                    {totalStoresWithoutGeo === 1 ? "tienda" : "tiendas"} sin coordenadas.
                  </p>
                )}
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Leyenda</h3>
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-foreground/80 ring-2 ring-white" />
                  Tiendas (color = zona)
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-foreground/15" />
                  Alcaldías sin zona
                </li>
              </ul>
            </section>

            <p className="text-[10px] leading-relaxed text-muted-foreground/60">
              Las zonas son agrupaciones comerciales. Una tienda hereda su zona desde la dirección que capturas al
              crearla.
            </p>
          </aside>
        </div>
      )}

      <ZoneFormSheet
        open={creating || editing !== null}
        onOpenChange={onSheetClose}
        zone={editing ?? undefined}
        presetMunicipalityIds={presetMunicipalityIds}
      />
    </div>
  );
}

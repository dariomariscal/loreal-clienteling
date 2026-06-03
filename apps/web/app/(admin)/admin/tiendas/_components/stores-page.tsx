"use client";

import { useState } from "react";
import { useStores, useZones, type Store } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StoresIllustration } from "@/components/ui/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreFormSheet } from "./store-form-sheet";

const BANNER_LABEL: Record<string, string> = {
  liverpool: "Liverpool",
  palacio: "Palacio de Hierro",
  owned: "Boutique propia",
};

interface StoresPageProps {
  user: { role?: string | null };
}

export function StoresPage({ user }: StoresPageProps) {
  const role = user.role ?? "beauty_advisor";
  const { data: stores = [], isLoading } = useStores();
  const { data: zones = [] } = useZones();
  const { open: openCreate } = useCreateMenu();
  const [editing, setEditing] = useState<Store | null>(null);

  const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z.displayName]));

  const columns: Column<Store>[] = [
    { key: "code", label: "Código" },
    { key: "displayName", label: "Nombre" },
    {
      key: "banner",
      label: "Banner",
      render: (v) => (
        <Badge variant="secondary">{BANNER_LABEL[v as string] ?? (v as string)}</Badge>
      ),
    },
    {
      key: "zoneId",
      label: "Zona",
      render: (v) => zoneMap[v as string] ?? "—",
    },
    { key: "city", label: "Ciudad", render: (v) => (v as string) ?? "—" },
    { key: "phone", label: "Teléfono", render: (v) => (v as string) ?? "—" },
    {
      key: "active",
      label: "Estado",
      render: (v) => (
        <Badge variant={v ? "success" : "destructive"} size="sm">
          {v ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    ...(can(role, "store.edit")
      ? [
          {
            key: "actions" as const,
            label: "",
            className: "w-10",
            render: (_: unknown, row: Store) => (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditing(row)}
              >
                <EditIcon className="size-3.5" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Tiendas"
        description="Puntos de venta físicos del portafolio"
        action={
          can(role, "store.create") ? (
            <Button onClick={() => openCreate("store")}>Nueva tienda</Button>
          ) : undefined
        }
      />

      {stores.length === 0 && !isLoading ? (
        <EmptyState
          illustration={<StoresIllustration className="w-full" />}
          title="Ninguna tienda registrada"
          description="Empieza añadiendo tu primer punto de venta. Verás un mapa con la ubicación y podrás asociarle marcas."
          action={
            can(role, "store.create") ? (
              <Button onClick={() => openCreate("store")}>Crear primera tienda</Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={stores}
          isLoading={isLoading}
          emptyTitle="No hay tiendas"
        />
      )}

      <StoreFormSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        store={editing ?? undefined}
      />
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
    </svg>
  );
}

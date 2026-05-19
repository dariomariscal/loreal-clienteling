"use client";

import { useState } from "react";
import { useZones, type Zone } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ZonesIllustration } from "@/components/ui/illustrations";
import { Button } from "@/components/ui/button";
import { ZoneFormSheet } from "./zone-form-sheet";

interface ZonesPageProps {
  user: { role?: string | null };
}

export function ZonesPage({ user }: ZonesPageProps) {
  const role = user.role ?? "ba";
  const { data: zones = [], isLoading } = useZones();
  const { open: openCreate } = useCreateMenu();
  const [editing, setEditing] = useState<Zone | null>(null);

  const columns: Column<Zone>[] = [
    { key: "code", label: "Código" },
    { key: "displayName", label: "Nombre" },
    { key: "region", label: "Región", render: (v) => (v as string) ?? "—" },
    ...(can(role, "zone.edit")
      ? [
          {
            key: "actions" as const,
            label: "",
            className: "w-10",
            render: (_: unknown, row: Zone) => (
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Zonas"
        description="Agrupación de tiendas por región geográfica"
        action={
          can(role, "zone.create") ? (
            <Button onClick={() => openCreate("zone")}>Nueva zona</Button>
          ) : undefined
        }
      />

      {zones.length === 0 && !isLoading ? (
        <EmptyState
          illustration={<ZonesIllustration className="w-full" />}
          title="No hay zonas todavía"
          description="Las zonas agrupan tus tiendas por región. Crea la primera para empezar a organizarlas."
          action={
            can(role, "zone.create") ? (
              <Button onClick={() => openCreate("zone")}>Crear zona</Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={zones}
          isLoading={isLoading}
          emptyTitle="No hay zonas"
        />
      )}

      <ZoneFormSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        zone={editing ?? undefined}
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

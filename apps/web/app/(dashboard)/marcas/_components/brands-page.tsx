"use client";

import { useState } from "react";
import { useBrands, type Brand } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { BrandsIllustration } from "@/components/ui/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandFormSheet } from "./brand-form-sheet";

const TIER_VARIANT: Record<string, "info" | "default" | "secondary"> = {
  luxury: "default",
  premium: "info",
  mass: "secondary",
};

const TIER_LABEL: Record<string, string> = {
  luxury: "Lujo",
  premium: "Premium",
  mass: "Masivo",
};

interface BrandsPageProps {
  user: { role?: string | null };
}

export function BrandsPage({ user }: BrandsPageProps) {
  const role = user.role ?? "ba";
  const { data: brands = [], isLoading } = useBrands();
  const { open: openCreate } = useCreateMenu();
  const [editing, setEditing] = useState<Brand | null>(null);

  const columns: Column<Brand>[] = [
    { key: "code", label: "Código" },
    { key: "displayName", label: "Nombre" },
    {
      key: "tier",
      label: "Segmento",
      render: (v) => {
        const tier = v as string;
        return (
          <Badge variant={TIER_VARIANT[tier] ?? "secondary"}>
            {TIER_LABEL[tier] ?? tier}
          </Badge>
        );
      },
    },
    {
      key: "active",
      label: "Estado",
      render: (v) => (
        <Badge variant={v ? "success" : "destructive"} size="sm">
          {v ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    ...(can(role, "brand.edit")
      ? [
          {
            key: "actions" as const,
            label: "",
            className: "w-10",
            render: (_: unknown, row: Brand) => (
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
        title="Marcas"
        description="Portafolio de marcas L'Oréal"
        action={
          can(role, "brand.create") ? (
            <Button onClick={() => openCreate("brand")}>Nueva marca</Button>
          ) : undefined
        }
      />

      {brands.length === 0 && !isLoading ? (
        <EmptyState
          illustration={<BrandsIllustration className="w-full" />}
          title="Aún no hay marcas en el portafolio"
          description="Configura las marcas L'Oréal con su logo, colores y segmento para que tu equipo las vea en la app móvil."
          action={
            can(role, "brand.create") ? (
              <Button onClick={() => openCreate("brand")}>Crear primera marca</Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={brands}
          isLoading={isLoading}
          emptyTitle="No hay marcas"
        />
      )}

      <BrandFormSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        brand={editing ?? undefined}
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

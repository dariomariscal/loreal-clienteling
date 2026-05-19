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
    {
      key: "displayName",
      label: "Marca",
      render: (_, row) => <BrandIdentityCell brand={row} />,
    },
    {
      key: "primaryColor",
      label: "Branding",
      className: "w-40",
      render: (_, row) => <BrandColorsCell brand={row} />,
    },
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

function BrandIdentityCell({ brand }: { brand: Brand }) {
  const primary = brand.primaryColor ?? "#0A4C80";
  const monogram = brand.displayName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-4 min-w-0 py-1">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background p-2 shadow-sm overflow-hidden"
        style={!brand.logoUrl ? { backgroundColor: primary, padding: 0 } : undefined}
      >
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-lg font-semibold text-white">{monogram}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {brand.displayName}
        </div>
        <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
          {brand.code}
        </div>
      </div>
    </div>
  );
}

function BrandColorsCell({ brand }: { brand: Brand }) {
  if (!brand.primaryColor && !brand.accentColor) {
    return <span className="text-xs text-muted-foreground">Sin configurar</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {brand.primaryColor ? (
        <ColorChip color={brand.primaryColor} />
      ) : null}
      {brand.accentColor ? <ColorChip color={brand.accentColor} /> : null}
      <span className="ml-1 font-mono text-[11px] text-muted-foreground">
        {brand.primaryColor ?? brand.accentColor}
      </span>
    </div>
  );
}

function ColorChip({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border border-border shadow-sm"
      style={{ backgroundColor: color }}
      title={color}
    />
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

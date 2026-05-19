"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCustomers,
  useCustomerSearch,
  type Customer,
} from "@/lib/hooks";
import { LIFECYCLE_SEGMENTS } from "@loreal/contracts";
import { can } from "@/lib/permissions";
import { useCreateMenu } from "@/components/providers/create-menu-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/illustrations";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { CustomerFormSheet } from "./customer-form-sheet";

const SEGMENT_LABEL: Record<string, string> = {
  new: "Nueva",
  returning: "Recurrente",
  vip: "VIP",
  at_risk: "En riesgo",
};

const SEGMENT_VARIANT: Record<
  string,
  "default" | "info" | "success" | "warning" | "destructive"
> = {
  new: "info",
  returning: "default",
  vip: "success",
  at_risk: "warning",
};

interface CustomersPageProps {
  user: { role?: string | null };
}

export function CustomersPage({ user }: CustomersPageProps) {
  const role = user.role ?? "ba";
  const router = useRouter();
  const { open: openCreate } = useCreateMenu();

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const isSearching = search.length >= 2;

  const customersQuery = useCustomers(
    isSearching
      ? undefined
      : {
          page: page.toString(),
          limit: limit.toString(),
          ...(segment ? { segment } : {}),
        },
  );

  const searchQuery = useCustomerSearch(search);

  const customers = isSearching
    ? (searchQuery.data ?? [])
    : (customersQuery.data?.data ?? []);
  const totalCustomers = isSearching
    ? customers.length
    : (customersQuery.data?.total ?? 0);
  const isLoading = isSearching ? searchQuery.isLoading : customersQuery.isLoading;

  const [editing, setEditing] = useState<Customer | null>(null);

  const columns: Column<Customer>[] = [
    {
      key: "firstName",
      label: "Nombre",
      render: (_, row) => {
        const fullName = `${row.firstName} ${row.lastName}`;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={fullName} size="sm" />
            <span className="font-medium">{fullName}</span>
          </div>
        );
      },
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    {
      key: "lifecycleSegment",
      label: "Segmento",
      render: (v) => {
        const seg = v as string;
        return (
          <Badge variant={SEGMENT_VARIANT[seg] ?? "secondary"} size="sm">
            {SEGMENT_LABEL[seg] ?? seg}
          </Badge>
        );
      },
    },
    {
      key: "lastTransactionAt",
      label: "Última compra",
      render: (v) => {
        if (!v) return "—";
        return new Date(v as string).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      },
    },
    ...(can(role, "customer.edit")
      ? [
          {
            key: "actions" as const,
            label: "",
            className: "w-10",
            render: (_: unknown, row: Customer) => (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(row);
                }}
              >
                <EditIcon className="size-3.5" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  const totalPages = isSearching
    ? 1
    : Math.max(1, Math.ceil(totalCustomers / limit));

  const showEmptyState =
    customers.length === 0 && !isLoading && !isSearching && !segment;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Clientes"
        description={`${totalCustomers} clientas registradas`}
        action={
          can(role, "customer.create") ? (
            <Button onClick={() => openCreate("customer")}>
              Nueva clienta
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      {!showEmptyState && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o teléfono..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={segment}
            onValueChange={(v) => {
              setSegment(v ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los segmentos">
                {segment ? (SEGMENT_LABEL[segment] ?? segment) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {LIFECYCLE_SEGMENTS.map((seg) => (
                <SelectItem key={seg} value={seg}>
                  {SEGMENT_LABEL[seg] ?? seg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showEmptyState ? (
        <EmptyState
          illustration={<CustomersIllustration className="w-full" />}
          title="Aún no hay clientas registradas"
          description="Las clientas son el corazón del clienteling. Empieza registrando la primera para activar su perfil, historial y agenda."
          action={
            can(role, "customer.create") ? (
              <Button onClick={() => openCreate("customer")}>
                Registrar primera clienta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/clientes/${row.id}`)}
          emptyTitle="No hay clientes"
          emptyDescription={
            isSearching
              ? "No se encontraron resultados para tu búsqueda"
              : "Ajusta los filtros para ver más clientas"
          }
        />
      )}

      {!isSearching && !showEmptyState && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <CustomerFormSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        customer={editing ?? undefined}
      />
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
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

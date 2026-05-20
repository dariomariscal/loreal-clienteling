"use client";

import { useState } from "react";
import { useUsers, useStores, useBrands, type User } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamIllustration } from "@/components/ui/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { UserFormSheet } from "./user-form-sheet";

const ROLE_LABEL: Record<string, string> = {
  ba: "Beauty Advisor",
  manager: "Gerente",
  supervisor: "Supervisor",
  admin: "Administrador",
};

const ROLE_VARIANT: Record<
  string,
  "default" | "info" | "warning" | "destructive"
> = {
  admin: "destructive",
  supervisor: "warning",
  manager: "info",
  ba: "default",
};

interface UsersPageProps {
  user: { role?: string | null };
}

export function UsersPage({ user }: UsersPageProps) {
  const role = user.role ?? "ba";
  const [roleFilter, setRoleFilter] = useState<string>("");
  const { data: usersResponse, isLoading } = useUsers(
    roleFilter ? { role: roleFilter } : undefined,
  );
  const users = usersResponse?.data ?? [];
  const { data: stores = [] } = useStores();
  const { data: brands = [] } = useBrands();

  const [inviteOpen, setInviteOpen] = useState(false);

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.displayName]));
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.displayName]));

  const columns: Column<User>[] = [
    {
      key: "fullName",
      label: "Nombre",
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} size="sm" />
          <span className="font-medium">{row.fullName}</span>
        </div>
      ),
    },
    { key: "email", label: "Correo" },
    {
      key: "role",
      label: "Rol",
      render: (v) => {
        const r = v as string;
        return (
          <Badge variant={ROLE_VARIANT[r] ?? "default"}>
            {ROLE_LABEL[r] ?? r}
          </Badge>
        );
      },
    },
    {
      key: "storeId",
      label: "Tienda",
      render: (_, row) => row.storeName ?? storeMap[row.storeId ?? ""] ?? "—",
    },
    {
      key: "brandId",
      label: "Marca",
      render: (_, row) => row.brandName ?? brandMap[row.brandId ?? ""] ?? "—",
    },
    {
      key: "active",
      label: "Estado",
      render: (v, row) => {
        if (row.invitationStatus === "pending") {
          return <Badge variant="warning" size="sm">Pendiente</Badge>;
        }
        return (
          <Badge variant={v ? "success" : "destructive"} size="sm">
            {v ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Equipo"
        description={`${usersResponse?.total ?? 0} usuarios`}
        action={
          can(role, "user.manage") ? (
            <Button onClick={() => setInviteOpen(true)}>Invitar usuario</Button>
          ) : undefined
        }
      />

      {/* Role filter */}
      <div className="flex gap-2">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los roles</SelectItem>
            <SelectItem value="ba">Beauty Advisor</SelectItem>
            <SelectItem value="manager">Gerente</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.length === 0 && !isLoading ? (
        <EmptyState
          illustration={<TeamIllustration className="w-full" />}
          title="Aún no tienes equipo registrado"
          description="Agrega a tus Beauty Advisors, gerentes y supervisores para empezar a operar la plataforma."
          action={
            can(role, "user.manage") ? (
              <Button onClick={() => setInviteOpen(true)}>
                Invitar primer usuario
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyTitle="No hay usuarios"
        />
      )}

      <UserFormSheet open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

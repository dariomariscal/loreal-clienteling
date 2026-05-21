"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import {
  useUsers,
  useStores,
  useBrands,
  useZones,
  useResetUserPassword,
  type User,
  type ResetPasswordResult,
} from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamIllustration } from "@/components/ui/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { UserFormSheet } from "./user-form-sheet";
import { PasswordResultDialog } from "./password-result-dialog";

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
  const [brandFilter, setBrandFilter] = useState<string>("");
  const filters =
    roleFilter || brandFilter
      ? {
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(brandFilter ? { brandId: brandFilter } : {}),
        }
      : undefined;
  const { data: usersResponse, isLoading } = useUsers(filters);
  const users = usersResponse?.data ?? [];
  const { data: stores = [] } = useStores();
  const { data: brands = [] } = useBrands();
  const { data: zones = [] } = useZones();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);
  const resetPassword = useResetUserPassword();

  const canManage = can(role, "user.manage");

  function confirmReset() {
    if (!resetTarget) return;
    resetPassword.mutate(resetTarget.id, {
      onSuccess: (res) => {
        setResetTarget(null);
        setResetResult(res);
      },
    });
  }

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.displayName]));
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.displayName]));
  const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z.displayName]));

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
      label: "Ámbito",
      render: (_, row) => {
        if (row.role === "supervisor") {
          return zoneMap[row.zoneId ?? ""] ?? row.zoneId ?? "—";
        }
        if (row.role === "admin") return "Nacional";
        return row.storeName ?? storeMap[row.storeId ?? ""] ?? "—";
      },
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

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-px text-right",
      render: (_, row) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setResetTarget(row)}
            disabled={row.invitationStatus === "pending"}
            title={
              row.invitationStatus === "pending"
                ? "El usuario aún no ha aceptado la invitación"
                : "Restablecer contraseña"
            }
          >
            <KeyRoundIcon className="mr-1.5 h-3.5 w-3.5" />
            Restablecer
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Equipo"
        description={`${usersResponse?.total ?? 0} usuarios`}
        action={
          canManage ? (
            <Button onClick={() => setInviteOpen(true)}>Crear usuario</Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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
        <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las marcas</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {users.length === 0 && !isLoading ? (
        <EmptyState
          illustration={<TeamIllustration className="w-full" />}
          title="Aún no tienes equipo registrado"
          description="Agrega a tus Beauty Advisors, gerentes y supervisores para empezar a operar la plataforma."
          action={
            canManage ? (
              <Button onClick={() => setInviteOpen(true)}>
                Crear primer usuario
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

      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open && !resetPassword.isPending) setResetTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Se generará una nueva contraseña para{" "}
              <strong>{resetTarget?.fullName}</strong> y se cerrarán sus sesiones
              activas. La verás una sola vez.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {resetTarget?.email}
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={resetPassword.isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={confirmReset} disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Generando..." : "Restablecer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PasswordResultDialog
        result={resetResult}
        onClose={() => setResetResult(null)}
        title="Contraseña restablecida"
        description="Entrega esta contraseña al usuario por un canal seguro."
      />
    </div>
  );
}

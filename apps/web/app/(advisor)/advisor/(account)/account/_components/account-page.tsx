"use client";

import type { SessionUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBrand } from "@/lib/hooks/use-brands";
import { useStore } from "@/lib/hooks/use-stores";
import { AvatarUploadCard } from "@/app/(dashboard)/(configuracion)/perfil/_components/avatar-upload-card";
import { PersonalInfoCard } from "@/app/(dashboard)/(configuracion)/perfil/_components/personal-info-card";
import { AccountHeaderCard } from "../../_components/account-header-card";
import { WeeklySummaryCard } from "../../_components/weekly-summary-card";

const ROLE_LABELS: Record<string, string> = {
  ba: "Beauty Advisor",
  manager: "Gerente",
  supervisor: "Supervisor",
  admin: "Administrador",
};

interface Props {
  user: SessionUser;
}

/**
 * "/advisor/account" — the advisor's personal home. Wraps a brief activity
 * summary (so the page earns its keep beyond settings) with the existing
 * profile-editing cards from the dashboard so we keep Clerk integration
 * (avatar upload, name edit, password) in a single battle-tested spot.
 */
export function AccountPage({ user }: Props) {
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const { data: brand } = useBrand(user.brandId ?? "");
  const { data: store } = useStore(user.storeId ?? "");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8 lg:px-10 lg:py-10">
      <AccountHeaderCard user={user} />

      <WeeklySummaryCard />

      <AvatarUploadCard />
      <PersonalInfoCard />

      <Card>
        <CardHeader>
          <CardTitle>Información de cuenta</CardTitle>
          <CardDescription>
            Tu rol y asignaciones solo pueden ser modificados por un
            administrador. Si algo no es correcto, contacta a tu administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <ReadOnlyField label="Correo" value={user.email} />
            <ReadOnlyField label="Rol" value={roleLabel} />
            <ReadOnlyField
              label="Sucursal"
              value={
                store?.displayName ??
                (user.storeId ? "Cargando…" : "Sin asignar")
              }
            />
            <ReadOnlyField
              label="Marca"
              value={
                brand?.displayName ??
                (user.brandId ? "Cargando…" : "Sin asignar")
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

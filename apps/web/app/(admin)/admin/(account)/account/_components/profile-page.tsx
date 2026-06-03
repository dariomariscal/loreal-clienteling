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
import { SettingsPageHeader } from "../../_components/settings-page-header";
import { AvatarUploadCard } from "./avatar-upload-card";
import { PersonalInfoCard } from "./personal-info-card";

const ROLE_LABELS: Record<string, string> = {
  ba: "Beauty Advisor",
  manager: "Gerente",
  supervisor: "Supervisor",
  admin: "Administrador",
};

interface ProfilePageProps {
  user: SessionUser;
}

/**
 * "/admin/account" — personal account → Perfil tab.
 *
 * Avatar + name + read-only org assignment (rol, sucursal, marca). The
 * password flow lives in the sibling "/admin/security" route to match what
 * GitHub/Linear/Notion all do — security is its own section, not a card
 * buried in the profile editor.
 */
export function ProfilePage({ user }: ProfilePageProps) {
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const { data: brand } = useBrand(user.brandId ?? "");
  const { data: store } = useStore(user.storeId ?? "");

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Perfil"
        description="Tu foto, nombre y datos de cuenta. La información de seguridad vive en una sección aparte."
      />

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
              value={store?.displayName ?? (user.storeId ? "Cargando…" : "Sin asignar")}
            />
            <ReadOnlyField
              label="Marca"
              value={brand?.displayName ?? (user.brandId ? "Cargando…" : "Sin asignar")}
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

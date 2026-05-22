"use client";

import { UserProfile } from "@clerk/nextjs";
import type { SessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBrand } from "@/lib/hooks/use-brands";
import { useStore } from "@/lib/hooks/use-stores";

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
 * "/perfil" — self-service profile page.
 *
 * Layout follows the Linear/Notion/Stripe pattern: a read-only "Información
 * de cuenta" card up top (the bits only an admin can change — role, store,
 * brand) and the live Clerk `<UserProfile />` below for the things users can
 * change themselves (name, avatar, password, sessions, 2FA). Changes from
 * Clerk flow back to our mirror through the `user.updated` webhook, so we do
 * not have to wire any forms here.
 */
export function ProfilePage({ user }: ProfilePageProps) {
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const { data: brand } = useBrand(user.brandId ?? "");
  const { data: store } = useStore(user.storeId ?? "");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Administra tu información personal, contraseña y seguridad."
      />

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

      <ClerkProfileCard />
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

function ClerkProfileCard() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Datos personales y seguridad</CardTitle>
        <CardDescription>
          Cambia tu foto, nombre, contraseña y revisa tus sesiones activas.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none border-none bg-transparent",
              card: "shadow-none border-none bg-transparent p-0",
              navbar: "border-r border-border/60 bg-transparent",
              pageScrollBox: "px-0 py-0",
              page: "px-0",
              formButtonPrimary:
                "bg-primary text-primary-foreground rounded-xl normal-case text-sm font-medium",
              formFieldInput:
                "rounded-xl border-input focus-visible:ring-3 focus-visible:ring-ring/50",
              avatarImageActionsUpload: "rounded-xl",
              profileSectionPrimaryButton: "rounded-xl",
            },
            variables: {
              borderRadius: "0.75rem",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </CardContent>
    </Card>
  );
}

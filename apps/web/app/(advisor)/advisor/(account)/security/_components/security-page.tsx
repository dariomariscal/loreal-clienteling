"use client";

import type { SessionUser } from "@/lib/auth";
import { PasswordChangeCard } from "@/app/(dashboard)/(configuracion)/seguridad/_components/password-change-card";
import { AccountHeaderCard } from "../../_components/account-header-card";

interface Props {
  user: SessionUser;
}

/**
 * "/advisor/security" — password and (later) sessions. Reuses the dashboard
 * PasswordChangeCard so Clerk reverification logic stays in a single spot.
 */
export function SecurityPage({ user }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8 lg:px-10 lg:py-10">
      <AccountHeaderCard user={user} />

      <header className="space-y-1.5 px-1">
        <h2 className="font-[var(--font-heading)] text-xl tracking-tight text-foreground">
          Seguridad
        </h2>
        <p className="text-sm text-muted-foreground">
          Administra tu contraseña y sesiones activas.
        </p>
      </header>

      <PasswordChangeCard />
    </div>
  );
}

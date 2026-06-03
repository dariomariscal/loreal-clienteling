"use client";

import { SettingsPageHeader } from "../../_components/settings-page-header";
import { PasswordChangeCard } from "./password-change-card";

export function SecurityPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Seguridad"
        description="Administra tu contraseña y sesiones activas."
      />
      <PasswordChangeCard />
    </div>
  );
}

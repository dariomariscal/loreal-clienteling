"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SettingsPageHeader } from "../../_components/settings-page-header";

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Notificaciones"
        description="Elige cómo y cuándo quieres recibir avisos."
      />
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Esta sección está en construcción.
        </CardContent>
      </Card>
    </div>
  );
}

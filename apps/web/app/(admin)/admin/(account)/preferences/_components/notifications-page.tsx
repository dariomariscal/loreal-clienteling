"use client";

import * as React from "react";
import type { NotificationKind } from "@loreal/contracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BellGlyph } from "@/components/ui/glyphs";
import {
  useNotificationPreferences,
  useUpsertNotificationPreference,
} from "@/lib/hooks/use-notification-preferences";
import { useEnablePush } from "@/lib/hooks/use-push-subscriptions";
import {
  NOTIFICATION_KIND_GROUPS,
  NOTIFICATION_KIND_META,
} from "@/lib/notifications/notification-kind-meta";
import { SettingsPageHeader } from "../../_components/settings-page-header";

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Notificaciones"
        description="Elige qué alertas quieres recibir y por qué canal."
      />
      <PushSetupCard />
      <PreferencesByGroupCards />
    </div>
  );
}

// ── Push setup card ─────────────────────────────────────────────────

/**
 * Owns the "activar push en este dispositivo" flow. Talks only to
 * `useEnablePush()` — that hook hides Service Worker registration, VAPID
 * fetch and `pushManager.subscribe()` behind a single `enable()` call.
 */
function PushSetupCard() {
  const { state, enable, disable } = useEnablePush();
  const supported =
    state.support.notifications &&
    state.support.pushManager &&
    state.support.serviceWorker;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones push</CardTitle>
        <CardDescription>
          Recibe alertas urgentes incluso cuando tengas la app cerrada en
          este dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PushStatusLine
          supported={supported}
          permission={state.permission}
          isSubscribed={state.isSubscribed}
        />

        {!supported ? (
          <Alert variant="warning">
            <BellGlyph className="size-4" />
            <AlertDescription>
              Tu navegador no soporta push. En iPad/iPhone, abre el menú
              Compartir y elige <strong>Agregar a pantalla de inicio</strong>{" "}
              para usar la app como aplicación.
            </AlertDescription>
          </Alert>
        ) : state.permission === "denied" ? (
          <Alert variant="warning">
            <BellGlyph className="size-4" />
            <AlertDescription>
              Bloqueaste el permiso de notificaciones para este sitio.
              Reactívalo desde la configuración del navegador.
            </AlertDescription>
          </Alert>
        ) : null}

        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          {state.isSubscribed ? (
            <Button
              variant="outline"
              size="sm"
              disabled={state.isEnabling}
              onClick={() => disable().catch(() => {})}
            >
              Desactivar en este dispositivo
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={
                !supported ||
                state.permission === "denied" ||
                state.isEnabling
              }
              onClick={() => enable().catch(() => {})}
            >
              {state.isEnabling
                ? "Activando…"
                : "Activar notificaciones push"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PushStatusLine({
  supported,
  permission,
  isSubscribed,
}: {
  supported: boolean;
  permission: NotificationPermission | "unknown";
  isSubscribed: boolean;
}) {
  let label: string;
  let tone: "ok" | "muted" | "warn";

  if (!supported) {
    label = "No disponible en este navegador";
    tone = "warn";
  } else if (isSubscribed) {
    label = "Activadas en este dispositivo";
    tone = "ok";
  } else if (permission === "denied") {
    label = "Permiso bloqueado";
    tone = "warn";
  } else if (permission === "granted") {
    label = "Permiso concedido — sin suscripción activa";
    tone = "muted";
  } else {
    label = "Sin activar";
    tone = "muted";
  }

  const dotClass =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : "bg-muted-foreground/50";

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`size-2 rounded-full ${dotClass}`} aria-hidden />
      {label}
    </p>
  );
}

// ── Preference toggles ──────────────────────────────────────────────

/**
 * Renders the 17 kinds in three groups (urgent/important/useful). Each row
 * is two independent toggles (in-app + push) — KISS: no quiet-hours UI in
 * v1, that's a follow-up.
 */
function PreferencesByGroupCards() {
  const { data, isLoading } = useNotificationPreferences();
  const upsert = useUpsertNotificationPreference();

  // Pivot the array into a kind → resolved map so each row reads in O(1).
  const byKind = React.useMemo(() => {
    const map = new Map(
      (data ?? []).map((p) => [p.kind, p] as const),
    );
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Cargando preferencias…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {NOTIFICATION_KIND_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <ColumnHeaders />
            <ul className="divide-y divide-border">
              {group.kinds.map((kind) => {
                const pref = byKind.get(kind);
                return (
                  <li key={kind}>
                    <PreferenceRow
                      kind={kind}
                      inAppEnabled={pref?.inAppEnabled ?? true}
                      pushEnabled={pref?.pushEnabled ?? false}
                      onChange={(patch) =>
                        upsert.mutate({ kind, ...patch })
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function ColumnHeaders() {
  return (
    <div className="flex items-center gap-3 px-2 pb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
      <span className="flex-1">Tipo de alerta</span>
      <span className="w-16 text-center">En la app</span>
      <span className="w-16 text-center">Push</span>
    </div>
  );
}

interface PreferenceRowProps {
  kind: NotificationKind;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  onChange: (patch: {
    inAppEnabled?: boolean;
    pushEnabled?: boolean;
  }) => void;
}

function PreferenceRow({
  kind,
  inAppEnabled,
  pushEnabled,
  onChange,
}: PreferenceRowProps) {
  const meta = NOTIFICATION_KIND_META[kind];
  const Icon = meta.icon;
  const inAppId = `pref-${kind}-inapp`;
  const pushId = `pref-${kind}-push`;

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Label htmlFor={inAppId} className="text-sm font-medium text-foreground">
          {meta.label}
        </Label>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </div>
      <div className="flex w-16 justify-center">
        <Checkbox
          id={inAppId}
          checked={inAppEnabled}
          onCheckedChange={(v) => onChange({ inAppEnabled: Boolean(v) })}
        />
      </div>
      <div className="flex w-16 justify-center">
        <Checkbox
          id={pushId}
          checked={pushEnabled}
          onCheckedChange={(v) => onChange({ pushEnabled: Boolean(v) })}
        />
      </div>
    </div>
  );
}

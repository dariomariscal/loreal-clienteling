"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { SessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckGlyph } from "@/components/ui/glyphs";
import { AccountHeaderCard } from "../../_components/account-header-card";

type Channel = "whatsapp" | "sms" | "email";
type Language = "es" | "en";

interface Preferences {
  defaultMessageChannel: Channel;
  language: Language;
  notifyOnBirthday: boolean;
  notifyOnUpcomingAppointment: boolean;
  notifyOnIncomingMessage: boolean;
}

const DEFAULTS: Preferences = {
  defaultMessageChannel: "whatsapp",
  language: "es",
  notifyOnBirthday: true,
  notifyOnUpcomingAppointment: true,
  notifyOnIncomingMessage: true,
};

interface Props {
  user: SessionUser;
}

/**
 * Self-editable preferences persisted to Clerk `unsafeMetadata` — the user
 * can write them directly from the client SDK without an admin endpoint.
 * If we later need server-side enforcement (e.g. notifications worker), the
 * same shape moves to a `user_preferences` table without changing this UI.
 */
export function PreferencesPage({ user }: Props) {
  const { isLoaded, user: clerkUser } = useUser();
  const [values, setValues] = useState<Preferences>(DEFAULTS);
  const [baseline, setBaseline] = useState<Preferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    const stored = (clerkUser.unsafeMetadata?.preferences ?? {}) as Partial<Preferences>;
    const next: Preferences = { ...DEFAULTS, ...stored };
    setValues(next);
    setBaseline(next);
  }, [isLoaded, clerkUser]);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  async function onSave() {
    if (!clerkUser) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await clerkUser.update({
        unsafeMetadata: {
          ...(clerkUser.unsafeMetadata ?? {}),
          preferences: values,
        },
      });
      setBaseline(values);
      setSuccess(true);
    } catch {
      setError("No se pudieron guardar las preferencias. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setValues(baseline);
    setSuccess(false);
    setError(null);
  }

  function patch<K extends keyof Preferences>(key: K, val: Preferences[K]) {
    setValues((v) => ({ ...v, [key]: val }));
    setSuccess(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8 lg:px-10 lg:py-10">
      <AccountHeaderCard user={user} />

      <header className="space-y-1.5 px-1">
        <h2 className="font-[var(--font-heading)] text-xl tracking-tight text-foreground">
          Preferencias
        </h2>
        <p className="text-sm text-muted-foreground">
          Elige cómo se comporta la app para ti. Los cambios se aplican de
          inmediato en este dispositivo.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Valores predeterminados</CardTitle>
          <CardDescription>
            Se usan al iniciar una nueva conversación o al ingresar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Canal de mensajes predeterminado</Label>
            <Select
              value={values.defaultMessageChannel}
              onValueChange={(v) => patch("defaultMessageChannel", v as Channel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Correo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select
              value={values.language}
              onValueChange={(v) => patch("language", v as Language)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>
            Elige qué avisos quieres recibir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            id="pref-bday"
            label="Cumpleaños de clientas"
            hint="Recibe un aviso la mañana del cumpleaños de una clienta."
            checked={values.notifyOnBirthday}
            onChange={(v) => patch("notifyOnBirthday", v)}
          />
          <ToggleRow
            id="pref-appt"
            label="Citas próximas"
            hint="Recordatorio una hora antes de cada cita agendada."
            checked={values.notifyOnUpcomingAppointment}
            onChange={(v) => patch("notifyOnUpcomingAppointment", v)}
          />
          <ToggleRow
            id="pref-msg"
            label="Mensajes entrantes"
            hint="Te avisamos cuando una clienta te responda."
            checked={values.notifyOnIncomingMessage}
            onChange={(v) => patch("notifyOnIncomingMessage", v)}
          />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              <CheckGlyph className="size-4" />
              <AlertDescription>Preferencias guardadas.</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dirty || saving}
              onClick={onReset}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dirty || saving}
              onClick={onSave}
            >
              {saving ? "Guardando…" : "Guardar preferencias"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:bg-muted/40"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </label>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import type { ClerkAPIError } from "@clerk/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFieldError, getGlobalError } from "@/lib/auth/clerk-errors";

/**
 * Acepta una invitación de Clerk. El admin la crea desde
 * `users.service.invite()` con publicMetadata pre-cargada (rol, store, etc.),
 * así que aquí solo fijamos la contraseña y activamos la sesión.
 */
export function AcceptInvitationForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket");

  const [errors, setErrors] = useState<ClerkAPIError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ticket) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invitación inválida</CardTitle>
          <CardDescription>
            El enlace expiró o es incorrecto. Pide uno nuevo a tu administrador.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    setErrors([]);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const attempt = await signUp.create({
        strategy: "ticket",
        ticket: ticket!,
        password,
      });

      if (attempt.status === "complete") {
        await setActive({
          session: attempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              router.push(`/tasks/${session.currentTask.key}`);
              return;
            }
            router.push("/");
          },
        });
        return;
      }

      setErrors([
        {
          code: "unsupported_status",
          message: `Estado inesperado: ${attempt.status}`,
          longMessage: "No pudimos activar tu cuenta.",
        } as ClerkAPIError,
      ]);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setErrors(err.errors);
      } else {
        setErrors([
          {
            code: "unknown_error",
            message: "Error desconocido",
            longMessage: "Ocurrió un error. Intenta de nuevo.",
          } as ClerkAPIError,
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordError = getFieldError(errors, "password");
  const globalError = getGlobalError(errors);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Activa tu cuenta</CardTitle>
        <CardDescription>
          Bienvenido(a) a L&apos;Oréal Clienteling. Crea una contraseña para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(passwordError) || undefined}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres.
            </p>
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          </div>

          {globalError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {globalError}
            </p>
          )}

          <Button
            type="submit"
            disabled={!isLoaded || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Activando…" : "Activar cuenta"}
          </Button>

          {/* Bot protection widget si Clerk lo requiere en este entorno. */}
          <div id="clerk-captcha" />
        </form>
      </CardContent>
    </Card>
  );
}

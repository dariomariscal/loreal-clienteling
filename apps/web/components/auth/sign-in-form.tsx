"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
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

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<ClerkAPIError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    setErrors([]);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const attempt = await signIn.create({
        strategy: "password",
        identifier,
        password,
      });

      if (attempt.status === "complete") {
        const redirectUrl = searchParams.get("redirect_url") ?? "/";
        await setActive({
          session: attempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              router.push(`/tasks/${session.currentTask.key}`);
              return;
            }
            router.push(redirectUrl);
          },
        });
        return;
      }

      // Si el tenant exige 2FA u otra verificación, aquí extenderíamos.
      setErrors([
        {
          code: "unsupported_status",
          message: `Estado inesperado: ${attempt.status}`,
          longMessage: "No pudimos completar el inicio de sesión.",
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

  const emailError = getFieldError(errors, "identifier");
  const passwordError = getFieldError(errors, "password");
  const globalError = getGlobalError(errors);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>L&apos;Oréal Clienteling</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(emailError) || undefined}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(passwordError) || undefined}
            />
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
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
